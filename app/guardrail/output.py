"""Output-side guardrails.

Input filtering is necessary but never sufficient: a jailbreak that gets through
is only visible in what the model says back.  These detectors run on the
response and can block it after generation.

The canary detector deserves a note.  A random token is embedded in the system
prompt and never shown to the user.  If it ever appears in a response, the model
leaked its own system prompt verbatim — no heuristic needed, it is a
zero-false-positive signal, which is why it is the demo's clearest evidence
that the unguarded lane failed.
"""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

from .base import BaseDetector, DetectorResult, Finding, Severity, Stage

# Markdown/HTML constructs that cause a client to issue an outbound request the
# user never asked for, with data smuggled into the URL.
_EXFIL_PATTERNS = (
    (re.compile(r"!\[[^\]]*\]\(\s*(https?://[^)\s]+)\s*\)"), "markdown_image"),
    (re.compile(r"<img[^>]+src\s*=\s*['\"]?(https?://[^'\"\s>]+)"), "html_image"),
    (re.compile(r"\[[^\]]*\]\(\s*(https?://[^)\s]*[?&][^)\s]*=[^)\s]*)\s*\)"), "markdown_link_query"),
)

# A query string carrying a long opaque value is the payload half of the attack.
_SUSPICIOUS_QUERY = re.compile(r"[?&][\w%.-]+=[A-Za-z0-9%+/=_-]{24,}")

_SYSTEM_PROMPT_ECHO = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"you\s+are\s+a\s+[\w\s]{3,40}\s+assistant",
        r"(?:my|the)\s+system\s+prompt\s+(?:is|says|reads)",
        r"내\s*(?:시스템\s*)?(?:프롬프트|지시사항)(?:은|는)\s*(?:다음|아래)",
        r"^\s*(?:system|시스템)\s*(?:prompt|프롬프트)\s*[:：]",
    )
)

_REFUSAL_MARKERS = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"\bi\s+(?:can'?t|cannot|won'?t|am\s+unable\s+to)\s+(?:help|assist|provide|do)\b",
        r"\bi'?m\s+not\s+able\s+to\s+(?:help|assist|provide)\b",
        r"(?:도와드릴|알려드릴|제공할)\s*수\s*없",
        r"(?:요청(?:을|은))?\s*(?:거절|거부)합니다",
    )
)


class CanaryLeakDetector(BaseDetector):
    """Deterministic system-prompt-leak detection via a secret canary token."""

    name = "canary"
    stage = Stage.OUTPUT
    title = "시스템 프롬프트 유출 (카나리아)"
    description = (
        "시스템 프롬프트에 사용자에게 절대 노출되지 않는 카나리아 토큰을 심어둡니다. "
        "응답에 이 토큰이 나타나면 시스템 프롬프트가 그대로 유출된 것이므로 오탐이 없습니다."
    )

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        findings: list[Finding] = []
        canary = context.get("canary_token")

        if canary and canary in text:
            findings.append(
                Finding(
                    detector=self.name,
                    category="leak.system_prompt_canary",
                    severity=Severity.CRITICAL,
                    confidence=1.0,
                    message="카나리아 토큰이 응답에 포함되었습니다. 시스템 프롬프트가 유출되었습니다.",
                    evidence=canary,
                    metadata={"deterministic": True},
                )
            )

        for pattern in _SYSTEM_PROMPT_ECHO:
            if m := pattern.search(text):
                findings.append(
                    Finding(
                        detector=self.name,
                        category="leak.system_prompt_echo",
                        severity=Severity.HIGH,
                        confidence=0.6,
                        message="응답이 시스템 프롬프트를 그대로 되풀이하는 형태입니다.",
                        evidence=m.group(0)[:120],
                        span=m.span(),
                    )
                )
                break

        return self._result(findings=findings)


class ExfiltrationDetector(BaseDetector):
    """Catch data-exfiltration-by-rendering in model output."""

    name = "exfil"
    stage = Stage.OUTPUT
    title = "데이터 반출 (마크다운/이미지) 검사"
    description = (
        "응답에 삽입된 마크다운 이미지·링크가 외부 도메인으로 데이터를 실어 보내는지 "
        "검사합니다. 클라이언트가 렌더링하는 순간 사용자 모르게 요청이 발생합니다."
    )

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        findings: list[Finding] = []
        allowed = set(context.get("allowed_domains") or [])

        for pattern, kind in _EXFIL_PATTERNS:
            for match in pattern.finditer(text):
                url = match.group(1)
                host = (urlparse(url).hostname or "").lower()
                carries_payload = bool(_SUSPICIOUS_QUERY.search(url))

                if host in allowed and not carries_payload:
                    continue

                severity = Severity.CRITICAL if carries_payload else Severity.MEDIUM
                findings.append(
                    Finding(
                        detector=self.name,
                        category=f"exfil.{kind}",
                        severity=severity,
                        confidence=0.9 if carries_payload else 0.5,
                        message=(
                            f"외부 도메인({host})으로 데이터를 전달하는 {kind} 구문이 응답에 있습니다."
                            if carries_payload
                            else f"허용되지 않은 외부 도메인({host})을 참조하는 {kind} 구문이 있습니다."
                        ),
                        evidence=url[:160],
                        span=match.span(),
                        metadata={"host": host, "carries_payload": carries_payload},
                    )
                )

        return self._result(findings=findings)


class RefusalConsistencyDetector(BaseDetector):
    """Flag the case where input scored high but the model complied anyway.

    This is the signal that matters most for measuring guardrail value: it is
    exactly the set of requests where the input pipeline was the only thing
    standing between the user and a harmful answer.
    """

    name = "refusal_consistency"
    stage = Stage.OUTPUT
    title = "거절 일관성 검사"
    description = (
        "입력 단계에서 위험도가 높았는데 모델이 거절하지 않고 응답한 경우를 표시합니다. "
        "가드레일이 없었다면 그대로 통과했을 요청을 정량화하는 지표입니다."
    )

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        findings: list[Finding] = []
        input_risk = float(context.get("input_risk_score", 0.0))
        refused = any(p.search(text) for p in _REFUSAL_MARKERS)

        if input_risk >= 50 and not refused:
            findings.append(
                Finding(
                    detector=self.name,
                    category="policy.model_complied_with_risky_input",
                    severity=Severity.HIGH,
                    confidence=0.75,
                    message=(
                        f"입력 위험도 {input_risk:.0f}점에도 모델이 거절 없이 응답했습니다. "
                        "모델 자체 안전장치만으로는 차단되지 않는 요청입니다."
                    ),
                    metadata={"input_risk_score": input_risk, "model_refused": refused},
                )
            )

        return self._result(findings=findings, context={"model_refused": refused})
