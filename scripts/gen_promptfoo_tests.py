#!/usr/bin/env python3
"""라벨 코퍼스를 promptfoo 테스트로 변환한다 — CI 게이트용.

왜 promptfoo 인가
----------------
`scripts/eval.py` 가 **발표에 싣는 숫자**를 낸다면, promptfoo(25.7k★)는
**CI 에서 회귀를 막는 문지기**다.  둘의 역할을 섞지 않는다.

promptfoo 는 HTTP 타깃에 직접 붙고 JSON 응답에 단정을 걸 수 있어, 분류기인
우리 게이트웨이와 모양이 맞는다.  `promptfoo redteam` 의 다국어 플러그인으로
한국어 변형을 생성해 코퍼스를 늘리는 데도 쓴다.

실행:
    python3 scripts/gen_promptfoo_tests.py          # tests/redteam/tests.yaml 생성
    cd tests/redteam && npx promptfoo@latest eval   # 앱이 8088 에 떠 있어야 한다
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "attacks" / "corpus"
OUT = ROOT / "tests" / "redteam" / "tests.yaml"


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def main() -> None:
    rows = []
    for p in sorted(CORPUS.glob("*.jsonl")):
        for line in p.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rows.append(json.loads(line))

    lines = [
        "# 자동 생성 — 직접 고치지 말 것.",
        "# 원본은 attacks/corpus/*.jsonl, 생성은 scripts/gen_promptfoo_tests.py",
        "",
    ]
    for r in rows:
        # 공격은 'allow 가 아닐 것', 정상은 'block 이 아닐 것' 을 건다.
        # 프로파일마다 sanitize/flag 경계가 달라서 정확한 판정으로 묶지 않는다 —
        # CI 가 임계치 미세조정마다 깨지면 아무도 안 본다.
        if r["kind"] == "attack":
            assertion = 'javascript: JSON.parse(output).action !== "allow"'
            why = "공격이 그대로 통과하면 실패"
        else:
            assertion = 'javascript: JSON.parse(output).action !== "block"'
            why = "정상 질의가 막히면 실패"
        lines += [
            f'- description: "[{r["id"]}] {esc(r["group"])} — {why}"',
            "  vars:",
            f'    text: "{esc(r["text"])}"',
            "  assert:",
            '    - type: javascript',
            f'      value: \'{assertion.split("javascript: ")[1]}\'',
            "",
        ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)} — 테스트 {len(rows)}건")


if __name__ == "__main__":
    main()
