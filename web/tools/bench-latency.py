#!/usr/bin/env python3
"""가드레일이 사용자를 붙잡는 시간을 잰다 — 사이트의 「실측」 카드가 쓰는 숫자.

사이트에 지연 수치를 실으려면 반드시 이 스크립트로 다시 재고 그 값을 쓴다.
추정치를 적지 않는다 (CLAUDE.md 정확성 원칙).

  실행:  cd <repo>          # 저장소 루트에서
         python3 web/tools/bench-latency.py

  Python 3.10 미만이면 dataclass(slots=)·zip(strict=) 때문에 임포트가 막힌다.
  그 경우 아래 SHIM 을 임시 모듈로 얹어 실행한다 (--shim 옵션이 자동으로 한다).

측정 대상은 사용자를 실제로 기다리게 하는 두 구간뿐이다:
  inspect_input   전송 직전, 질의를 검사하는 시간
  inspect_output  응답을 받은 뒤, 사용자에게 주기 전 검사하는 시간

데모 화면의 단계별 연출 지연(step_delay)은 0 으로 둔다.  그건 판정 과정을
눈으로 보여 주려고 넣은 인위적 대기라 실제 서비스에는 없다.
"""
import argparse
import asyncio
import json
import os
import statistics
import sys
import time

SHIM = '''
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
'''

WARMUP = 5
UNIT_CLEAN = "이번 학기 장학금 지급 절차와 필요 서류를 정리한 내부 안내문입니다. "
UNIT_PII = "홍길동 20201234 900101-1234568 010-1234-5678 hong@kaist.ac.kr 지급 대상입니다. "


def p95(v):
    return sorted(v)[max(0, int(len(v) * 0.95) - 1)]


async def timed(fn, text, ctx, repeat):
    for _ in range(WARMUP):
        await fn(text, context=dict(ctx), step_delay=0)
    out = []
    for _ in range(repeat):
        t0 = time.perf_counter()
        await fn(text, context=dict(ctx), step_delay=0)
        out.append((time.perf_counter() - t0) * 1000)
    return out


async def main(args):
    from app.guardrail.engine import GuardrailEngine

    samples = json.load(open("attacks/samples.json"))["samples"]
    engines, rows = {}, []
    reply = ("요청하신 내용을 정리하면 다음과 같습니다. " * 12).strip()
    ictx = {"canary_token": "CANARY-BENCH-0001"}
    octx = {"canary_token": "CANARY-BENCH-0001", "input_risk_score": 0, "allowed_domains": []}

    for s in samples:
        clr = s.get("clearance", "student")
        eng = engines.setdefault(clr, GuardrailEngine(args.profile, clearance=clr))
        ti = await timed(eng.inspect_input, s["prompt"], ictx, args.repeat)
        to = await timed(eng.inspect_output, reply, octx, args.repeat)
        rows.append((statistics.median(ti), p95(ti), statistics.median(to), p95(to)))

    med_in = statistics.median([r[0] for r in rows])
    max_in = max(r[1] for r in rows)
    med_out = statistics.median([r[2] for r in rows])
    max_out = max(r[3] for r in rows)
    print(f"# 프로파일 {args.profile} · 코퍼스 {len(rows)}건 · 각 {args.repeat}회 "
          f"(워밍업 {WARMUP}회 제외) · step_delay=0")
    print(f"출국 검사(질의)   중앙 {med_in:.2f} ms · 최대 {max_in:.2f} ms")
    print(f"입국 검사(답변)   중앙 {med_out:.2f} ms · 최대 {max_out:.2f} ms")
    print(f"합계(한 번 오갈 때) 중앙 {med_in + med_out:.2f} ms · 최대 {max_in + max_out:.2f} ms")

    print("\n# 길이 비례 — 검사는 훑는 방식이라 글자 수에 선형이다")
    eng = GuardrailEngine(args.profile, clearance="staff")
    print(f"{'자수':>7}{'질의 검사':>11}{'답변 검사':>11}{'합계':>9}  본문")
    for label, unit in (("일반", UNIT_CLEAN), ("PII 밀집", UNIT_PII)):
        for n in (100, 2000, 10000):
            text = (unit * (n // len(unit) + 1))[:n]
            ti = await timed(eng.inspect_input, text, ictx, max(10, args.repeat // 3))
            to = await timed(eng.inspect_output, text, octx, max(10, args.repeat // 3))
            mi, mo = statistics.median(ti), statistics.median(to)
            print(f"{n:>7}{mi:>11.2f}{mo:>11.2f}{mi + mo:>9.2f}  {label}")

    print("\n# 비교 기준: 외부 AI 엔드포인트까지 네트워크 왕복(하한선)")
    print("#   ping -c 10 api.openai.com  등으로 따로 잰다.")
    print("#   실제 응답에는 여기에 TLS 수립과 토큰 생성이 더 붙는다.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--profile", default="balanced")
    ap.add_argument("--repeat", type=int, default=40)
    a = ap.parse_args()
    sys.path.insert(0, os.getcwd())
    if sys.version_info < (3, 10):
        import tempfile
        d = tempfile.mkdtemp()
        open(os.path.join(d, "sitecustomize.py"), "w").write(SHIM)
        if os.environ.get("_BENCH_SHIMMED") != "1":
            os.environ["_BENCH_SHIMMED"] = "1"
            os.environ["PYTHONPATH"] = d + os.pathsep + os.environ.get("PYTHONPATH", "")
            os.execv(sys.executable, [sys.executable] + sys.argv)
    asyncio.run(main(a))
