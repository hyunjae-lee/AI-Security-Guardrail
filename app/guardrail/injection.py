"""Prompt-injection and jailbreak detection.

Grouped by attack technique rather than by keyword, because the policy engine
scores a prompt that hits *three different techniques* far higher than one that
matches three synonyms of the same trick.  Every pattern runs against the
normalized text from `normalizer.py`, so encoding tricks do not bypass it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from .base import BaseDetector, DetectorResult, Finding, Severity, Stage


@dataclass(frozen=True)
class InjectionRule:
    technique: str
    label: str
    severity: Severity
    confidence: float
    patterns: tuple[re.Pattern[str], ...]


def _p(*expressions: str) -> tuple[re.Pattern[str], ...]:
    return tuple(re.compile(e, re.IGNORECASE | re.MULTILINE) for e in expressions)


RULES: tuple[InjectionRule, ...] = (
    InjectionRule(
        technique="instruction_override",
        label="지시 무시 / 상위 지시 덮어쓰기",
        severity=Severity.HIGH,
        confidence=0.9,
        patterns=_p(
            r"ignore\s+(?:all\s+|any\s+)?(?:the\s+)?(?:previous|prior|above|earlier|preceding)\s+"
            r"(?:instruction|prompt|rule|direction|command|message)s?",
            r"disregard\s+(?:all\s+|any\s+)?(?:previous|prior|above|earlier|the\s+system)",
            r"forget\s+(?:everything|all)\s+(?:you|above|before|previously)",
            r"이전(?:의)?\s*(?:모든\s*)?(?:지시|명령|규칙|프롬프트)(?:사항)?(?:을|를)?\s*(?:무시|잊)",
            r"위(?:의|에서)?\s*(?:모든\s*)?(?:지시|명령|규칙)(?:을|를)?\s*(?:무시|잊)",
            r"앞서?\s*(?:받은|말한)?\s*(?:지시|명령)(?:을|를)?\s*(?:무시|취소)",
            r"override\s+(?:your|the)\s+(?:system\s+)?(?:prompt|instruction|rule|guideline)",
            r"new\s+instructions?\s*[:：]\s*",
            r"실제\s*지시(?:사항)?\s*(?:은|는)\s*(?:다음|아래)",
        ),
    ),
    InjectionRule(
        technique="role_manipulation",
        label="역할 조작 / 탈옥 페르소나",
        severity=Severity.HIGH,
        confidence=0.85,
        patterns=_p(
            r"\byou\s+are\s+now\s+(?:a|an|in|no\s+longer)\b",
            r"\bact\s+as\s+(?:if\s+you|a|an)\b.{0,40}(?:no\s+restriction|unrestricted|uncensored|jailbroken)",
            r"\bpretend\s+(?:to\s+be|you\s+are)\b.{0,40}(?:no\s+rule|without\s+restriction|unfiltered)",
            r"\bDAN\b\s*(?:mode|prompt)?",
            r"\bdo\s+anything\s+now\b",
            r"developer\s+mode\s+(?:enabled|on|activated)",
            r"(?:god|admin|root|sudo)\s*mode\s*(?:enabled|on|activated)",
            r"당신은\s*이제\s*(?:더\s*이상\s*)?(?:제한|규칙|필터)(?:이|가)?\s*없",
            r"(?:너는|당신은)\s*지금부터\s*.{0,20}(?:역할|캐릭터)(?:을|를)?\s*(?:연기|수행)",
            r"(?:규칙|제한|제약|필터)(?:이|가)?\s*없는\s*(?:AI|assistant|어시스턴트|모델|챗봇)",
            r"(?:아무\s*)?(?:제한|제약)\s*없이\s*.{0,10}(?:답변|대답|응답|답)해?",
        ),
    ),
    InjectionRule(
        technique="system_prompt_extraction",
        label="시스템 프롬프트 탈취",
        severity=Severity.HIGH,
        confidence=0.88,
        patterns=_p(
            r"(?:print|show|reveal|output|repeat|display|dump)\s+(?:me\s+)?(?:your|the)\s+"
            r"(?:system\s+)?(?:prompt|instruction|rule|guideline|configuration|directive)s?",
            r"what\s+(?:is|are)\s+your\s+(?:system\s+)?(?:prompt|initial\s+instruction|original\s+instruction)s?",
            r"repeat\s+(?:everything|the\s+text)\s+(?:above|before)",
            r"(?:시스템|초기|원본)\s*프롬프트.{0,20}(?:출력|알려|보여|공개|노출|말해)",
            r"너의?\s*(?:지시사항|설정|규칙|프롬프트).{0,20}(?:그대로\s*)?(?:출력|알려|보여|공개)",
            r"위(?:에|의).{0,8}(?:텍스트|내용|말|문장).{0,8}그대로.{0,8}(?:반복|출력)",
            r"내부\s*(?:설정|지침|프롬프트|규칙).{0,12}(?:공개|노출|출력|알려)",
        ),
    ),
    InjectionRule(
        technique="delimiter_injection",
        label="구분자 위조 / 포맷 인젝션",
        severity=Severity.HIGH,
        confidence=0.82,
        patterns=_p(
            r"</?\s*(?:system|assistant|human|instruction|im_start|im_end)\s*>",
            r"\[/?INST\]",
            r"<\|(?:im_start|im_end|system|endoftext|eot_id|start_header_id)\|>",
            r"^\s*#{1,3}\s*(?:system|instruction)\s*[:：]",
            r"^\s*(?:system|assistant)\s*[:：]\s*$",
            r"\{\{\s*system\s*\}\}",
        ),
    ),
    InjectionRule(
        technique="indirect_injection",
        label="간접 인젝션 마커",
        severity=Severity.MEDIUM,
        confidence=0.7,
        patterns=_p(
            r"(?:if\s+you\s+are\s+an?\s+(?:AI|language\s+model|assistant)).{0,60}(?:then|you\s+must|please)",
            r"(?:AI|assistant|모델)\s*(?:에게|에|여)\s*[:：].{0,40}(?:무시|실행|전송)",
            r"important\s+(?:note|message)\s+(?:for|to)\s+(?:the\s+)?(?:AI|assistant|model)",
            r"이\s*(?:문서|페이지|내용)(?:를|을)\s*(?:읽는|처리하는)\s*(?:AI|모델|어시스턴트)(?:는|은)",
        ),
    ),
    InjectionRule(
        technique="output_hijack",
        label="출력 하이재킹 / 데이터 반출 유도",
        severity=Severity.HIGH,
        confidence=0.8,
        patterns=_p(
            r"!\[[^\]]*\]\(\s*https?://[^)]*[?&][^)]*=",  # markdown image exfil
            r"(?:send|post|upload|transmit|exfiltrate)\s+(?:it|this|the\s+\w+)\s+to\s+https?://",
            r"(?:append|include|encode)\s+.{0,30}\s+(?:in|into|to)\s+(?:the\s+)?URL",
            r"(?:결과|대화|내용|정보)(?:를|을|\s*전체를)?\s*.{0,40}https?://",
            r"https?://\S{0,40}\?\w+=.{0,30}(?:붙여|전송|삽입|보내)",
            r"마크다운\s*이미지(?:로|으로)?\s*(?:삽입|출력|렌더|만들)",
            r"(?:주소|url)\s*(?:뒤에|끝에|맨\s*뒤)?.{0,10}붙여",
        ),
    ),
    InjectionRule(
        technique="encoding_smuggle",
        label="인코딩 우회 지시",
        severity=Severity.MEDIUM,
        confidence=0.65,
        patterns=_p(
            r"decode\s+(?:the\s+)?(?:following|this|below)\s+(?:base64|hex|rot13|url)",
            r"(?:base64|rot13|hex)\s*(?:로|으로)?\s*(?:인코딩|디코딩)(?:된|해서|하여)",
            r"answer\s+in\s+(?:base64|rot13|leetspeak|morse)",
        ),
    ),
    InjectionRule(
        technique="hypothetical_framing",
        label="가상 상황 프레이밍",
        severity=Severity.MEDIUM,
        confidence=0.55,
        patterns=_p(
            r"(?:hypothetically|in\s+a\s+fictional\s+(?:world|story|scenario))\b.{0,80}"
            r"(?:how\s+(?:would|do)|explain|describe)",
            r"(?:for\s+(?:research|educational)\s+purposes?\s+only)\b.{0,60}"
            r"(?:how\s+to|step\s+by\s+step|instruction)",
            r"(?:소설|영화|시나리오|가상)\s*(?:속|에서|이라고\s*가정)",
            r"단지\s*(?:연구|교육)\s*목적",
        ),
    ),
)

# Techniques that, combined, indicate a deliberate multi-vector attack.
_COMBO_BONUS = 12.0


class InjectionDetector(BaseDetector):
    """Score prompt-injection attempts by technique diversity, not keyword count."""

    name = "injection"
    stage = Stage.INPUT
    title = "프롬프트 인젝션 탐지"
    description = (
        "지시 무시, 역할 조작, 시스템 프롬프트 탈취, 구분자 위조, 간접 인젝션 등 "
        "기법별로 탐지하고 서로 다른 기법이 동시에 나타날수록 위험도를 가중합니다."
    )

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        haystacks = {
            "original": text,
            "normalized": context.get("normalized", text),
            "leet": context.get("leet", ""),
        }
        findings: list[Finding] = []
        hit_techniques: set[str] = set()

        for rule in RULES:
            matched: tuple[str, re.Match[str]] | None = None
            for source, hay in haystacks.items():
                if not hay:
                    continue
                for pattern in rule.patterns:
                    m = pattern.search(hay)
                    if m:
                        matched = (source, m)
                        break
                if matched:
                    break
            if not matched:
                continue

            source, m = matched
            # A hit that only appears after decoding is stronger evidence of
            # intent than one visible in plain text.
            confidence = rule.confidence
            if source != "original":
                confidence = min(1.0, confidence + 0.05)

            hit_techniques.add(rule.technique)
            findings.append(
                Finding(
                    detector=self.name,
                    category=f"injection.{rule.technique}",
                    severity=rule.severity,
                    confidence=confidence,
                    message=f"{rule.label} 패턴이 탐지되었습니다.",
                    evidence=m.group(0)[:160],
                    span=m.span() if source == "original" else None,
                    metadata={"technique": rule.technique, "matched_in": source},
                )
            )

        if len(hit_techniques) >= 2:
            findings.append(
                Finding(
                    detector=self.name,
                    category="injection.multi_technique",
                    severity=Severity.CRITICAL,
                    confidence=min(1.0, 0.5 + 0.15 * len(hit_techniques)),
                    message=(
                        f"서로 다른 인젝션 기법 {len(hit_techniques)}종이 동시에 사용되었습니다 "
                        f"({', '.join(sorted(hit_techniques))})."
                    ),
                    metadata={"techniques": sorted(hit_techniques), "bonus": _COMBO_BONUS},
                )
            )

        return self._result(
            findings=findings,
            context={"injection_techniques": sorted(hit_techniques)},
        )
