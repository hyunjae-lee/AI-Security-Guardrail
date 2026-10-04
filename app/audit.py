"""Append-only audit log over SQLite.

A guardrail that blocks silently is unoperable — the security team needs to see
what was blocked, why, and whether the block was right.  Every request writes
one row with the finding set, so the dashboard can answer "what did we stop this
week" without re-running anything.

**원문은 저장하지 않는다.**
이 프로젝트는 세 군데에서 그렇게 약속한다 — CLAUDE.md 의 비유 매핑표,
설명 사이트 SCENE 08(기록실), 발표 덱의 판정 슬라이드.
그런데 구현은 `entry["prompt"][:280]` 으로 **앞 280자를 그대로 저장하고 있었다.**
짧은 질의는 통째로 들어간다 — 「제 주민번호는 900101-1234568 …」이 그대로 남는다.

그래서 기본값을 "저장하지 않음" 으로 바꾸고, 대신 두 가지를 남긴다.
  · `prompt_length` — 얼마나 긴 것이 나갔는지
  · `prompt_digest` — 소금 친 해시.  **같은 질의가 반복됐는지**는 알 수 있고
    내용은 복원할 수 없다.  사고 조사에서 「같은 프롬프트가 40번 나갔다」를
    말할 수 있어야 하기 때문이다.

finding 의 `evidence` 도 원문 조각이라 같이 가린다 (예: harmful 은 매치된
구절을 그대로 담는다).  카테고리·심각도·판정 근거 문구는 템플릿이라 그대로 둔다.

`GUARDRAIL_AUDIT_PREVIEW=1` 로 켤 수 있지만 **운영에서는 켜지 않는다.**
로컬에서 탐지기를 디버깅할 때만 쓴다.
"""

from __future__ import annotations

import hashlib
import json
import os
import secrets as _secrets
import sqlite3
import threading
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

#: 원문 미리보기를 저장할지. 기본은 **저장하지 않음**.
STORE_PREVIEW = os.environ.get("GUARDRAIL_AUDIT_PREVIEW", "").strip().lower() in {
    "1", "true", "yes", "on",
}

#: 해시에 섞는 소금. 주지 않으면 기동할 때마다 새로 만든다 —
#: 그러면 재시작 전후의 해시가 달라지는 대신, 사전 대입으로 원문을 되찾을 수 없다.
#: 재시작을 넘겨 상관 분석을 하려면 운영에서 고정값을 준다.
_SALT = os.environ.get("GUARDRAIL_AUDIT_SALT") or _secrets.token_hex(16)

_REDACTED = "[원문 미저장]"

#: 감사 로그 보존 일수. 0 이면 지우지 않는다.
#: 적극 시나리오에서 하루 207 MB 가 쌓이므로(docs/deployment-sizing.md), 보존 정책이
#: 없으면 3년에 226 GB 가 된다.  N2SF 도 정보흐름 로그를 "일정 기간" 보관하라고
#: 할 뿐 영구 보관을 요구하지 않는다.
RETENTION_DAYS = int(os.environ.get("GUARDRAIL_AUDIT_RETENTION_DAYS", "365"))


def digest(prompt: str) -> str:
    """원문을 복원할 수 없는 식별자. 같은 질의인지만 알 수 있다."""
    return hashlib.sha256((_SALT + prompt).encode("utf-8")).hexdigest()[:16]


def _redact_findings(findings: list[Any]) -> list[Any]:
    """finding 에서 원문 조각(evidence)만 길이로 바꾼다.

    카테고리·심각도·메시지는 템플릿이라 남겨도 원문이 새지 않는다.
    evidence 는 탐지기마다 다른데(마스킹된 것도, 그대로인 것도 있다)
    **한 곳에서 일괄로** 가린다 — 탐지기를 새로 쓸 때 빠뜨리지 않기 위해서다.
    """
    out = []
    for f in findings:
        if not isinstance(f, dict):
            out.append(f)
            continue
        g = dict(f)
        ev = g.get("evidence")
        if isinstance(ev, str) and ev:
            g["evidence"] = f"({len(ev)}자 가림)"
        out.append(g)
    return out

_SCHEMA = """
CREATE TABLE IF NOT EXISTS requests (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    trace_id        TEXT    NOT NULL UNIQUE,
    created_at      TEXT    NOT NULL,
    profile         TEXT    NOT NULL,
    backend         TEXT    NOT NULL,
    prompt_preview  TEXT    NOT NULL,
    prompt_length   INTEGER NOT NULL,
    prompt_digest   TEXT    NOT NULL DEFAULT '',
    input_action    TEXT    NOT NULL,
    input_score     REAL    NOT NULL,
    output_action   TEXT,
    output_score    REAL,
    final_action    TEXT    NOT NULL,
    unguarded_leak  INTEGER NOT NULL DEFAULT 0,
    categories      TEXT    NOT NULL,
    findings        TEXT    NOT NULL,
    total_ms        REAL    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_final_action ON requests(final_action);
"""


class AuditLog:
    """Thread-safe SQLite writer. One connection, guarded by a lock."""

    def __init__(self, path: Path, enabled: bool = True) -> None:
        self.path = path
        self.enabled = enabled
        self._lock = threading.Lock()
        self._conn: sqlite3.Connection | None = None
        if enabled:
            self._connect()

    def _connect(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(_SCHEMA)
        # 이미 만들어진 DB 에는 prompt_digest 가 없다. 있으면 넘어간다.
        cols = {r[1] for r in self._conn.execute("PRAGMA table_info(requests)")}
        if "prompt_digest" not in cols:
            self._conn.execute(
                "ALTER TABLE requests ADD COLUMN prompt_digest TEXT NOT NULL DEFAULT ''"
            )
        self._conn.commit()

    def purge_expired(self, now: datetime | None = None) -> int:
        """보존 기간이 지난 행을 지운다. 지운 건수를 돌려준다.

        쌓이는 것을 막는 것이 목적이지만, 더 중요한 것은 **가지고 있지 않은 것은
        유출될 수 없다**는 점이다. 보관 기간은 짧을수록 좋다.
        """
        if not self.enabled or self._conn is None or RETENTION_DAYS <= 0:
            return 0
        now = now or datetime.now(UTC)
        cutoff = (now - timedelta(days=RETENTION_DAYS)).isoformat(timespec="seconds")
        with self._lock:
            cur = self._conn.execute(
                "DELETE FROM requests WHERE created_at < ?", (cutoff,)
            )
            self._conn.commit()
            return cur.rowcount or 0

    def stats_for_ops(self) -> dict[str, Any]:
        """운영 지표 — 판정 분포가 급변하면 룰이 망가진 것이다."""
        if not self.enabled or self._conn is None:
            return {"enabled": False}
        with self._lock:
            rows = self._conn.execute(
                "SELECT final_action, COUNT(*) FROM requests "
                "WHERE created_at >= ? GROUP BY final_action",
                ((datetime.now(UTC) - timedelta(days=1)).isoformat(timespec="seconds"),),
            ).fetchall()
            total = self._conn.execute("SELECT COUNT(*) FROM requests").fetchone()[0]
        by_action = {r[0]: r[1] for r in rows}
        day_total = sum(by_action.values())
        return {
            "enabled": True,
            "rows_total": total,
            "last_24h": by_action,
            "last_24h_total": day_total,
            "block_rate_24h": round(by_action.get("block", 0) / day_total, 4)
            if day_total
            else 0.0,
            "retention_days": RETENTION_DAYS,
            "stores_raw_prompt": STORE_PREVIEW,
        }

    def record(self, entry: dict[str, Any]) -> None:
        if not self.enabled or self._conn is None:
            return
        row = {
            "trace_id": entry["trace_id"],
            "created_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "profile": entry["profile"],
            "backend": entry["backend"],
            "prompt_preview": entry["prompt"][:280] if STORE_PREVIEW else _REDACTED,
            "prompt_length": len(entry["prompt"]),
            "prompt_digest": digest(entry["prompt"]),
            "input_action": entry["input_action"],
            "input_score": entry["input_score"],
            "output_action": entry.get("output_action"),
            "output_score": entry.get("output_score"),
            "final_action": entry["final_action"],
            "unguarded_leak": int(bool(entry.get("unguarded_leak"))),
            "categories": json.dumps(entry.get("categories", []), ensure_ascii=False),
            "findings": json.dumps(
                entry.get("findings", [])
                if STORE_PREVIEW
                else _redact_findings(entry.get("findings", [])),
                ensure_ascii=False,
            ),
            "total_ms": entry.get("total_ms", 0.0),
        }
        with self._lock:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO requests
                (trace_id, created_at, profile, backend, prompt_preview, prompt_length,
                 prompt_digest, input_action, input_score, output_action, output_score,
                 final_action, unguarded_leak, categories, findings, total_ms)
                VALUES
                (:trace_id, :created_at, :profile, :backend, :prompt_preview, :prompt_length,
                 :prompt_digest, :input_action, :input_score, :output_action, :output_score,
                 :final_action, :unguarded_leak, :categories, :findings, :total_ms)
                """,
                row,
            )
            self._conn.commit()

    def recent(self, limit: int = 50) -> list[dict[str, Any]]:
        if not self.enabled or self._conn is None:
            return []
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM requests ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
        out = []
        for row in rows:
            item = dict(row)
            item["categories"] = json.loads(item["categories"])
            item["findings"] = json.loads(item["findings"])
            out.append(item)
        return out

    def stats(self) -> dict[str, Any]:
        if not self.enabled or self._conn is None:
            return {"enabled": False, "total": 0, "by_action": {}, "top_categories": [], "leaks_prevented": 0}

        with self._lock:
            total = self._conn.execute("SELECT COUNT(*) AS c FROM requests").fetchone()["c"]
            by_action = {
                r["final_action"]: r["c"]
                for r in self._conn.execute(
                    "SELECT final_action, COUNT(*) AS c FROM requests GROUP BY final_action"
                ).fetchall()
            }
            leaks = self._conn.execute(
                "SELECT COUNT(*) AS c FROM requests WHERE unguarded_leak = 1"
            ).fetchone()["c"]
            avg_ms = self._conn.execute(
                "SELECT AVG(total_ms) AS a FROM requests"
            ).fetchone()["a"]
            cat_rows = self._conn.execute(
                "SELECT categories FROM requests ORDER BY id DESC LIMIT 500"
            ).fetchall()

        counter: dict[str, int] = {}
        for row in cat_rows:
            for category in json.loads(row["categories"]):
                counter[category] = counter.get(category, 0) + 1
        top = sorted(counter.items(), key=lambda kv: kv[1], reverse=True)[:12]

        return {
            "enabled": True,
            "total": total,
            "by_action": by_action,
            "top_categories": [{"category": c, "count": n} for c, n in top],
            "leaks_prevented": leaks,
            "avg_latency_ms": round(avg_ms or 0.0, 2),
        }

    def close(self) -> None:
        with self._lock:
            if self._conn is not None:
                self._conn.close()
                self._conn = None
