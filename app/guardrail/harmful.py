"""Harmful-content classification with an intent-aware allowlist.

The naive version of this detector flags every prompt containing the word
"malware" and is useless in a security org, where half the legitimate traffic is
about malware.  So each category carries two signal sets:

  * `topic`  — the subject matter is present at all
  * `intent` — the user is asking for operational capability ("how do I build",
               "give me working code", "step by step")

A topic hit alone is INFO.  Topic + intent is what actually scores.  A separate
`defensive` allowlist (detection, analysis, mitigation, CTF, incident response)
suppresses the intent signal, so "analyze this malware sample" stays allowed
while "write me working ransomware" does not.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from .base import BaseDetector, DetectorResult, Finding, Severity, Stage


def _p(*expressions: str) -> tuple[re.Pattern[str], ...]:
    return tuple(re.compile(e, re.IGNORECASE) for e in expressions)


@dataclass(frozen=True)
class HarmCategory:
    key: str
    label: str
    severity: Severity
    topic: tuple[re.Pattern[str], ...]
    # Categories where the topic alone is enough (no legitimate framing exists).
    topic_alone: bool = False


# Signals that the user wants operational capability, not understanding.
INTENT_PATTERNS = _p(
    r"\bhow\s+(?:do\s+i|to|can\s+i)\b",
    r"\bstep[- ]by[- ]step\b",
    r"\bgive\s+me\s+(?:the\s+)?(?:code|script|instructions?|recipe|steps?)\b",
    r"\bwrite\s+(?:me\s+)?(?:a\s+)?(?:working|functional|complete)\b",
    r"\b(?:build|make|create|synthesize|manufacture|produce)\s+(?:a|an|me)\b",
    r"(?:만드는|제조|합성|제작)\s*(?:법|방법)",
    r"(?:어떻게|어떡하면)\s*.{0,20}(?:만들|제조|합성|해킹|침입)",
    r"(?:단계별로|자세히)\s*(?:알려|설명|가르쳐)",
    r"(?:코드|스크립트|프로그램|룰).{0,4}(?:작성|제작|만들|짜|써)",
)

# Framing that indicates defensive, analytical, or educational use.
DEFENSIVE_PATTERNS = _p(
    r"\b(?:detect|detection|defend|defense|mitigate|mitigation|protect|prevent|harden)\w*\b",
    r"\b(?:analy[sz]e|analysis|reverse[- ]engineer|forensic|incident\s+response|triage)\w*\b",
    r"\b(?:indicator|IOC|signature|YARA|sigma|SIEM|SOC|threat\s+(?:intel|hunting))\b",
    r"\b(?:CTF|capture\s+the\s+flag|pentest|penetration\s+test|bug\s+bounty|red\s+team)\b",
    r"\b(?:vulnerability\s+(?:assessment|scan)|security\s+(?:audit|review|research))\b",
    r"(?:탐지|방어|대응|완화|예방|차단|분석|포렌식|모의해킹|취약점\s*진단|보안\s*연구)",
)

CATEGORIES: tuple[HarmCategory, ...] = (
    HarmCategory(
        key="weapons",
        label="무기 · 폭발물",
        severity=Severity.CRITICAL,
        topic=_p(
            r"\b(?:pipe\s+bomb|ied|explosive\s+device|detonator|nerve\s+agent|chemical\s+weapon)\b",
            r"\b(?:bioweapon|biological\s+weapon|weaponi[sz]ed\s+(?:pathogen|anthrax))\b",
            r"(?:폭탄|사제\s*폭발물|기폭\s*장치|생화학\s*무기|신경\s*작용제)",
        ),
    ),
    HarmCategory(
        key="malware",
        label="악성코드 제작",
        severity=Severity.HIGH,
        topic=_p(
            r"\b(?:ransomware|keylogger|rootkit|botnet|trojan|worm|cryptolocker|wiper)\b",
            r"\b(?:reverse\s+shell|c2\s+(?:server|framework)|command\s+and\s+control)\b",
            r"\b(?:0day|zero[- ]day)\s+exploit\b",
            r"(?:랜섬웨어|키로거|루트킷|봇넷|악성코드|백도어)",
        ),
    ),
    HarmCategory(
        key="intrusion",
        label="무단 침입 · 계정 탈취",
        severity=Severity.HIGH,
        topic=_p(
            r"\bhack\s+(?:into|someone|my\s+(?:ex|neighbor|friend)|their)\b",
            r"\b(?:bypass|crack|brute[- ]force)\s+(?:the\s+)?(?:login|password|2fa|mfa|authentication)\b",
            r"\bsteal\s+(?:someone'?s?\s+)?(?:password|credential|account|session|cookie)s?\b",
            r"(?:계정|비밀번호)\s*(?:탈취|해킹|크랙)",
            r"(?:남의|타인의)\s*(?:폰|컴퓨터|계정)(?:을|를)?\s*(?:해킹|몰래)",
        ),
    ),
    HarmCategory(
        key="drugs",
        label="불법 약물 제조",
        severity=Severity.HIGH,
        topic=_p(
            r"\b(?:synthesi[sz]e|cook|manufacture)\s+(?:meth|methamphetamine|fentanyl|mdma|lsd)\b",
            r"\b(?:meth|fentanyl)\s+(?:lab|recipe|synthesis)\b",
            r"(?:마약|필로폰|메스암페타민|펜타닐)\s*(?:제조|합성|만드는)",
        ),
    ),
    HarmCategory(
        key="self_harm",
        label="자해 · 자살",
        severity=Severity.CRITICAL,
        topic=_p(
            r"\b(?:how\s+to\s+)?(?:kill\s+myself|commit\s+suicide|end\s+my\s+life)\b",
            r"\b(?:most\s+)?(?:painless|effective|lethal)\s+(?:way|method)\s+to\s+die\b",
            r"(?:자살|극단적\s*선택).{0,6}(?:방법|하는\s*법)",
            r"(?:죽는|죽을|자해).{0,6}(?:방법|법)(?:을|를)?\s*(?:알려|가르쳐|알고)",
        ),
        topic_alone=True,
    ),
    HarmCategory(
        key="csam",
        label="아동 성착취",
        severity=Severity.CRITICAL,
        topic=_p(
            r"\b(?:child|minor|underage)\s+(?:sexual|porn|nude|explicit)\w*\b",
            r"\bcsam\b",
            r"(?:아동|미성년자)\s*(?:성착취|음란|성적)",
        ),
        topic_alone=True,
    ),
    HarmCategory(
        key="hate",
        label="혐오 · 차별 선동",
        severity=Severity.HIGH,
        topic=_p(
            r"\b(?:genocide|ethnic\s+cleansing)\b.{0,40}\b(?:justify|plan|argue\s+for)\b",
            r"\bwhy\s+(?:all\s+)?\w+\s+(?:people|race)s?\s+(?:are|should\s+be)\s+"
            r"(?:inferior|exterminated|removed)\b",
            r"(?:인종|민족|성별)\s*(?:청소|말살|혐오)(?:를|을)?\s*(?:정당화|선동)",
        ),
    ),
    HarmCategory(
        key="fraud",
        label="사기 · 피싱",
        severity=Severity.HIGH,
        topic=_p(
            r"\b(?:phishing|smishing)\s+(?:email|page|site|kit|template)\b",
            r"\bwrite\s+.{0,30}\b(?:scam|fraudulent)\s+(?:message|email|letter)\b",
            r"\b(?:fake|forged|counterfeit)\s+(?:id|passport|invoice|receipt|certificate)\b",
            r"(?:피싱|보이스피싱|스미싱)\s*(?:메일|문자|사이트|스크립트)",
            r"(?:위조|가짜)\s*(?:신분증|여권|영수증|증명서)",
        ),
    ),
)


class HarmfulContentDetector(BaseDetector):
    """Classify harmful requests while letting defensive-security work through."""

    name = "harmful"
    stage = Stage.INPUT
    title = "유해 요청 분류"
    description = (
        "무기·악성코드·침입·약물·자해·혐오·사기 등 카테고리를 분류합니다. "
        "주제어만으로는 차단하지 않고 '실행 가능한 방법 요구' 의도가 함께 나타날 때 "
        "점수를 부여하며, 탐지·분석·대응 등 방어 목적 표현은 완화 신호로 처리합니다."
    )

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        target = context.get("normalized", text)
        findings: list[Finding] = []

        intent_hit = next((m.group(0) for p in INTENT_PATTERNS if (m := p.search(target))), None)
        defensive_hit = next(
            (m.group(0) for p in DEFENSIVE_PATTERNS if (m := p.search(target))), None
        )

        for category in CATEGORIES:
            match = next((m for p in category.topic if (m := p.search(target))), None)
            if not match:
                continue

            operational = category.topic_alone or intent_hit is not None
            suppressed = defensive_hit is not None and not category.topic_alone

            if not operational:
                severity, confidence = Severity.INFO, 0.4
                message = f"{category.label} 관련 주제어가 언급되었습니다 (실행 의도 없음)."
            elif suppressed:
                severity, confidence = Severity.LOW, 0.35
                message = (
                    f"{category.label} 주제 + 실행 의도가 보이지만 방어/분석 목적 표현"
                    f"('{defensive_hit}')이 함께 있어 위험도를 낮춥니다."
                )
            else:
                # A genuinely operational harmful request (harmful topic + intent
                # to obtain capability, with no defensive framing) must BLOCK, not
                # merely flag — so treat it as CRITICAL. A lone HIGH finding would
                # score ~55 and fall under the block threshold, letting the request
                # through to the model. The permissive profile still lets malware/
                # intrusion through via its never_block set (red-team use).
                severity = Severity.CRITICAL if category.severity is Severity.HIGH else category.severity
                confidence = 0.9
                message = f"{category.label}에 대한 실행 가능한 방법을 요구하고 있습니다."

            findings.append(
                Finding(
                    detector=self.name,
                    category=f"harmful.{category.key}",
                    severity=severity,
                    confidence=confidence,
                    message=message,
                    evidence=match.group(0)[:120],
                    metadata={
                        "category": category.key,
                        "intent_signal": intent_hit,
                        "defensive_signal": defensive_hit,
                        "operational": operational,
                    },
                )
            )

        return self._result(
            findings=findings,
            context={"harm_categories": [f.metadata["category"] for f in findings]},
        )


class HarmfulOutputDetector(HarmfulContentDetector):
    """Same taxonomy applied to the model's response.

    Input-side filtering is bypassable; checking the output is what catches a
    jailbreak that actually succeeded.
    """

    name = "harmful_output"
    stage = Stage.OUTPUT
    title = "응답 유해성 검사"
    description = "입력 필터를 우회한 요청에 모델이 실제로 유해한 답변을 했는지 검사합니다."
