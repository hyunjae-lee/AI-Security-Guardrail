"""Append-only audit log over SQLite.

A guardrail that blocks silently is unoperable — the security team needs to see
what was blocked, why, and whether the block was right.  Every request writes
one row with the full finding set, so the dashboard can answer "what did we stop
this week" without re-running anything.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

_SCHEMA = """
CREATE TABLE IF NOT EXISTS requests (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    trace_id        TEXT    NOT NULL UNIQUE,
    created_at      TEXT    NOT NULL,
    profile         TEXT    NOT NULL,
    backend         TEXT    NOT NULL,
    prompt_preview  TEXT    NOT NULL,
    prompt_length   INTEGER NOT NULL,
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
        self._conn.commit()

    def record(self, entry: dict[str, Any]) -> None:
        if not self.enabled or self._conn is None:
            return
        row = {
            "trace_id": entry["trace_id"],
            "created_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "profile": entry["profile"],
            "backend": entry["backend"],
            "prompt_preview": entry["prompt"][:280],
            "prompt_length": len(entry["prompt"]),
            "input_action": entry["input_action"],
            "input_score": entry["input_score"],
            "output_action": entry.get("output_action"),
            "output_score": entry.get("output_score"),
            "final_action": entry["final_action"],
            "unguarded_leak": int(bool(entry.get("unguarded_leak"))),
            "categories": json.dumps(entry.get("categories", []), ensure_ascii=False),
            "findings": json.dumps(entry.get("findings", []), ensure_ascii=False),
            "total_ms": entry.get("total_ms", 0.0),
        }
        with self._lock:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO requests
                (trace_id, created_at, profile, backend, prompt_preview, prompt_length,
                 input_action, input_score, output_action, output_score, final_action,
                 unguarded_leak, categories, findings, total_ms)
                VALUES
                (:trace_id, :created_at, :profile, :backend, :prompt_preview, :prompt_length,
                 :input_action, :input_score, :output_action, :output_score, :final_action,
                 :unguarded_leak, :categories, :findings, :total_ms)
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
