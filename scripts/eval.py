#!/usr/bin/env python3
"""가드레일 탐지 성능을 실측한다 — 발표에 싣는 숫자를 여기서 얻는다.

왜 이 스크립트가 필요한가
------------------------
`tests/test_api.py` 는 `attacks/samples.json` 의 22건에 대해 기대 판정을 단정한다.
그런데 그 22건은 **데모 프리셋이기도 하고, 룰을 그 샘플을 보며 썼다.**  즉 그것은
회귀 테스트이지 성능 측정이 아니다.  그래서 CLAUDE.md 가 정확도 % 표기를 금지해 왔다.

이 스크립트는 별도의 라벨 코퍼스(`attacks/corpus/*.jsonl`)를 돌려 **재현 가능한
숫자**를 낸다.  특히 공격 탐지율만 보지 않고 **멀쩡한 질의를 막지 않는가**를 같은
비중으로 본다 — 공격만 모아 재면 숫자는 예쁘고 아무것도 알 수 없다.

무엇을 재는가
------------
1) 게이트 성능 (프로파일과 무관한 머릿수)
   · 공격 미탐    = 공격인데 ALLOW 로 그냥 나갔다        ← 가장 나쁜 실패
   · 하드 오탐    = 정상인데 BLOCK 당했다                 ← 사용자가 업무를 못 한다
   · 소프트 오탐  = 정상인데 치환/표시됐다                ← 나가긴 나갔다. 피해가 작다
   하드와 소프트를 나누는 이유: 마스킹돼 전달된 정상 질의와 아예 막힌 질의는
   사용자에게 전혀 다른 사건이다.  한 숫자로 뭉뚱그리면 설계 판단을 그르친다.

2) 정책 일치 (프로파일별 4x4 혼동행렬)
   코퍼스의 `expect` 는 **balanced 기준**으로 달았다.  strict/permissive 는
   임계치와 never_block 이 달라 불일치가 곧 오류는 아니다 — 그래서 비교용으로만 낸다.

3) 탐지기 적중률
   판정이 맞아도 **엉뚱한 탐지기**가 울렸다면 그건 운이다.  그룹마다 기대하는
   finding 접두사를 두고, 그게 실제로 떴는지 따로 센다.

실행
----
    python3 scripts/eval.py                    # balanced
    python3 scripts/eval.py --profile all      # 세 프로파일 비교
    python3 scripts/eval.py --scoring both     # worst_decay vs sum
    python3 scripts/eval.py --json out.json    # 기계가 읽을 형태로도 저장
    python3 scripts/eval.py --misses           # 실패한 항목을 모두 나열

Python 3.10 이상이 필요하다(엔진이 dataclass(slots=) 를 쓴다).  3.9 에서는 아래
SHIM 이 자동으로 얹힌다 — web/tools/bench-latency.py 와 같은 방식이다.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

# ── Python 3.9 호환 shim (bench-latency.py 와 같은 이유) ──────────────────
if sys.version_info < (3, 10):  # noqa: UP036 — 의도적 호환 shim (아래 주석 참고)
    import dataclasses as _d

    _orig = _d.dataclass

    def _patched(cls=None, /, **kw):
        kw.pop("slots", None)
        return _orig(cls, **kw) if cls is not None else _orig(**kw)

    _d.dataclass = _patched
    import builtins as _b

    _ozip = _b.zip

    def _zip(*a, **kw):
        kw.pop("strict", None)
        return _ozip(*a, **kw)

    _b.zip = _zip

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import asyncio  # noqa: E402

from app.guardrail.engine import PROFILES, GuardrailEngine  # noqa: E402

CORPUS_DIR = ROOT / "attacks" / "corpus"
ACTIONS = ("allow", "sanitize", "flag", "block")

# 그룹마다 "이 탐지기가 울려야 맞다" 는 접두사.
# 판정이 맞아도 엉뚱한 탐지기가 울렸으면 적중으로 치지 않는다.
EXPECTED_DETECTOR: dict[str, tuple[str, ...]] = {
    "attack.injection": ("injection.",),
    "attack.leak": ("injection.system_prompt_extraction", "injection."),
    "attack.pii": ("pii.",),
    "attack.secret": ("secret.",),
    "attack.harmful": ("harmful.",),
    # 입력단에서 반출 유도는 injection.output_hijack 으로 잡힌다.
    # exfil.* 는 출력 파이프라인의 카테고리라 여기서는 기대하지 않는다.
    "attack.exfil": ("injection.output_hijack", "injection."),
    "attack.obfuscation": ("obfuscation.", "injection."),
    "attack.rag": ("rag.",),
    "attack.pii_ner": ("pii.",),
}


def load_corpus(paths: list[Path]) -> list[dict]:
    rows: list[dict] = []
    seen: set[str] = set()
    for p in sorted(paths):
        for ln, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
            line = line.strip()
            if not line or line.startswith("//"):
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise SystemExit(f"{p.name}:{ln} JSON 오류 — {exc}") from exc
            for key in ("id", "kind", "group", "expect", "text"):
                if key not in row:
                    raise SystemExit(f"{p.name}:{ln} '{key}' 누락 — {row.get('id', '?')}")
            if row["id"] in seen:
                raise SystemExit(f"{p.name}:{ln} id 중복 — {row['id']}")
            seen.add(row["id"])
            row["_src"] = p.name
            rows.append(row)
    return rows


async def run(
    rows: list[dict], profile: str, scoring: str,
    use_pi: bool = False, use_presidio: bool = False,
) -> list[dict]:
    out = []
    # 권한 등급마다 엔진이 다르므로 재사용 캐시를 둔다 (생성 비용 절약).
    engines: dict[str, GuardrailEngine] = {}
    for row in rows:
        clr = row.get("clearance", "student")
        eng = engines.get(clr)
        if eng is None:
            eng = engines[clr] = GuardrailEngine(
                profile, scoring=scoring, clearance=clr,
                use_pi_model=use_pi, use_presidio=use_presidio,
            )
        res = await eng.inspect_input(row["text"], context={"clearance": clr}, step_delay=0)
        cats = [f.category for f in res.findings]
        out.append(
            {
                **{k: row[k] for k in ("id", "kind", "group", "expect", "text")},
                "clearance": clr,
                "action": res.action.value,
                "score": round(res.risk_score, 2),
                "categories": cats,
                "grade": res.context.get("data_grade"),
            }
        )
    return out


def detector_hit(group: str, cats: list[str]) -> bool | None:
    want = EXPECTED_DETECTOR.get(group)
    if not want:
        return None
    return any(c.startswith(w) or c == w for c in cats for w in want)


def summarize(results: list[dict]) -> dict:
    atk = [r for r in results if r["kind"] == "attack"]
    ben = [r for r in results if r["kind"] == "benign"]

    missed = [r for r in atk if r["action"] == "allow"]
    blocked = [r for r in atk if r["action"] == "block"]
    mitigated = [r for r in atk if r["action"] in ("sanitize", "flag")]

    hard_fp = [r for r in ben if r["action"] == "block"]
    soft_fp = [r for r in ben if r["expect"] == "allow" and r["action"] in ("sanitize", "flag")]
    ben_ok = [r for r in ben if r["action"] == r["expect"]]

    det = {}
    for g in sorted({r["group"] for r in atk}):
        rows = [r for r in atk if r["group"] == g]
        hits = [r for r in rows if detector_hit(g, r["categories"])]
        det[g] = (len(hits), len(rows))

    per_group: dict[str, dict] = {}
    for g in sorted({r["group"] for r in results}):
        rows = [r for r in results if r["group"] == g]
        is_atk = rows[0]["kind"] == "attack"
        per_group[g] = {
            "n": len(rows),
            "miss": sum(1 for r in rows if is_atk and r["action"] == "allow"),
            "hard_fp": sum(1 for r in rows if not is_atk and r["action"] == "block"),
            "soft_fp": sum(
                1
                for r in rows
                if not is_atk and r["expect"] == "allow" and r["action"] in ("sanitize", "flag")
            ),
            "match": sum(1 for r in rows if r["action"] == r["expect"]),
        }

    conf: dict[str, Counter] = defaultdict(Counter)
    for r in results:
        conf[r["expect"]][r["action"]] += 1

    return {
        "n": len(results),
        "attacks": len(atk),
        "benign": len(ben),
        "missed": missed,
        "blocked": len(blocked),
        "mitigated": len(mitigated),
        "hard_fp": hard_fp,
        "soft_fp": soft_fp,
        "benign_exact": len(ben_ok),
        "detector": det,
        "per_group": per_group,
        "confusion": {k: dict(v) for k, v in conf.items()},
    }


def pct(a: int, b: int) -> str:
    return f"{(100.0 * a / b):5.1f}%" if b else "    —"


def report(s: dict, profile: str, scoring: str) -> None:
    bar = "─" * 72
    print(f"\n{bar}\n 프로파일 {profile}   ·   점수 산정 {scoring}   ·   표본 {s['n']}건"
          f" (공격 {s['attacks']} / 정상 {s['benign']})\n{bar}")

    print("\n[1] 게이트 성능 — 프로파일과 무관한 머릿수")
    nm, na, nb = len(s["missed"]), s["attacks"], s["benign"]
    print(f"  공격을 그냥 통과시킴 (미탐)   {nm:4d} / {na:<4d}  {pct(nm, na)}   ← 가장 나쁜 실패")
    print(f"    └ 차단(BLOCK)                {s['blocked']:4d} / {na:<4d}  {pct(s['blocked'], na)}")
    print(f"    └ 완화(SANITIZE·FLAG)        {s['mitigated']:4d} / {na:<4d}  {pct(s['mitigated'], na)}")
    nh, ns = len(s["hard_fp"]), len(s["soft_fp"])
    print(f"  정상을 막아버림 (하드 오탐)   {nh:4d} / {nb:<4d}  {pct(nh, nb)}   ← 업무가 멈춘다")
    print(f"  정상을 건드림 (소프트 오탐)   {ns:4d} / {nb:<4d}  {pct(ns, nb)}   ← 나가긴 나간다")
    print(f"  정상을 기대대로 처리          {s['benign_exact']:4d} / {nb:<4d}  {pct(s['benign_exact'], nb)}")

    print("\n[2] 탐지기 적중 — 판정이 맞아도 엉뚱한 탐지기면 적중이 아니다")
    for g, (hit, tot) in s["detector"].items():
        flag = "" if hit == tot else "   ←"
        print(f"  {g:<22} {hit:3d} / {tot:<3d}  {pct(hit, tot)}{flag}")

    print("\n[3] 그룹별")
    print(f"  {'그룹':<24}{'n':>4}{'미탐':>6}{'하드FP':>8}{'소프트FP':>10}{'기대일치':>10}")
    for g, v in s["per_group"].items():
        print(f"  {g:<24}{v['n']:>4}{v['miss']:>6}{v['hard_fp']:>8}{v['soft_fp']:>10}"
              f"{v['match']:>7}/{v['n']:<3}")

    print("\n[4] 기대 대비 실제 (행=기대, 열=실제)  ※ 라벨은 balanced 기준")
    print(f"  {'':<10}" + "".join(f"{a:>10}" for a in ACTIONS))
    for exp in ACTIONS:
        row = s["confusion"].get(exp)
        if not row:
            continue
        print(f"  {exp:<10}" + "".join(f"{row.get(a, 0):>10}" for a in ACTIONS))


def show_failures(s: dict, limit: int) -> None:
    def dump(title: str, rows: list[dict]) -> None:
        if not rows:
            return
        print(f"\n── {title} ({len(rows)}건)")
        for r in rows[:limit]:
            cats = ", ".join(r["categories"][:3]) or "탐지 없음"
            print(f"  [{r['id']}] score={r['score']:<6} {cats}")
            print(f"      {r['text'][:72]}")
        if len(rows) > limit:
            print(f"  … 외 {len(rows) - limit}건 (--limit 으로 늘릴 수 있음)")

    dump("공격 미탐 — 그냥 통과했다", s["missed"])
    dump("하드 오탐 — 정상인데 막혔다", s["hard_fp"])
    dump("소프트 오탐 — 정상인데 건드렸다", s["soft_fp"])


def main() -> None:
    ap = argparse.ArgumentParser(description="가드레일 탐지 성능 실측")
    ap.add_argument("--profile", default="balanced",
                    choices=[*PROFILES, "all"], help="정책 프로파일 (기본 balanced)")
    ap.add_argument("--scoring", default="worst_decay",
                    choices=["worst_decay", "sum", "both"], help="점수 산정 방식")
    ap.add_argument("--corpus", default=str(CORPUS_DIR), help="코퍼스 디렉터리")
    ap.add_argument("--json", dest="json_out", help="결과를 JSON 으로 저장할 경로")
    ap.add_argument("--presidio", action="store_true",
                    help="Presidio(en+ko NER)를 켜고 잰다")
    ap.add_argument("--pi-model", action="store_true",
                    help="ONNX 인젝션 분류기를 켜고 잰다 (GUARDRAIL_PI_MODEL_DIR 필요)")
    ap.add_argument("--misses", action="store_true", help="실패 항목을 나열한다")
    ap.add_argument("--limit", type=int, default=12, help="나열 개수 상한")
    # CI 게이트용. 숫자를 못 넘기면 0 이 아닌 코드로 끝난다.
    # NER 같은 선택 탐지기가 있어야만 잡히는 군은 CI 에서 제외한다.
    # 기본 이미지에는 Presidio·ONNX 가 없어서 구조적으로 미탐이 되기 때문이다.
    ap.add_argument("--exclude-group", action="append", default=[],
                    help="이 그룹을 측정에서 뺀다 (여러 번 지정 가능)")
    ap.add_argument("--fail-over-miss", type=int, default=None,
                    help="공격 미탐이 이 건수를 넘으면 실패 처리한다 (CI 용)")
    ap.add_argument("--fail-over-hard-fp", type=int, default=None,
                    help="하드 오탐이 이 건수를 넘으면 실패 처리한다 (CI 용)")
    args = ap.parse_args()

    paths = sorted(Path(args.corpus).glob("**/*.jsonl"))
    if not paths:
        raise SystemExit(f"코퍼스를 찾지 못했습니다: {args.corpus}")
    rows = load_corpus(paths)
    if args.exclude_group:
        before = len(rows)
        rows = [r for r in rows if r["group"] not in set(args.exclude_group)]
        print(f"제외: {', '.join(args.exclude_group)} ({before - len(rows)}건)")
    print(f"코퍼스 {len(rows)}건  ({', '.join(p.name for p in paths)})")

    profiles = list(PROFILES) if args.profile == "all" else [args.profile]
    scorings = ["worst_decay", "sum"] if args.scoring == "both" else [args.scoring]

    bundle = {}
    for prof in profiles:
        for sc in scorings:
            results = asyncio.run(run(rows, prof, sc, use_pi=args.pi_model, use_presidio=args.presidio))
            s = summarize(results)
            report(s, prof, sc)
            if args.misses:
                show_failures(s, args.limit)
            bundle[f"{prof}:{sc}"] = {
                "profile": prof,
                "scoring": sc,
                "n": s["n"],
                "attacks": s["attacks"],
                "benign": s["benign"],
                "missed": [r["id"] for r in s["missed"]],
                "hard_fp": [r["id"] for r in s["hard_fp"]],
                "soft_fp": [r["id"] for r in s["soft_fp"]],
                "detector": s["detector"],
                "per_group": s["per_group"],
                "confusion": s["confusion"],
                "results": results,
            }

    # CI 게이트 — 기준을 넘으면 비정상 종료한다.
    failures: list[str] = []
    for key, bundle_entry in bundle.items():
        n_miss, n_hard = len(bundle_entry["missed"]), len(bundle_entry["hard_fp"])
        if args.fail_over_miss is not None and n_miss > args.fail_over_miss:
            failures.append(f"{key}: 공격 미탐 {n_miss}건 > 허용 {args.fail_over_miss}건")
        if args.fail_over_hard_fp is not None and n_hard > args.fail_over_hard_fp:
            failures.append(f"{key}: 하드 오탐 {n_hard}건 > 허용 {args.fail_over_hard_fp}건")

    if args.json_out:
        Path(args.json_out).write_text(
            json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"\nJSON 저장: {args.json_out}")

    print("\n※ 이 숫자는 attacks/corpus 의 라벨 코퍼스 기준이다. 코퍼스가 바뀌면 숫자도 바뀐다.")
    print("  발표에 실을 때는 반드시 코퍼스 규모와 구성을 함께 밝힐 것.\n")

    if failures:
        print("탐지 성능 회귀:")
        for f in failures:
            print(f"  ✗ {f}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
