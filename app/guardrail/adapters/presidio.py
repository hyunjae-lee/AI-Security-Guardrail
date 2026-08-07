"""Microsoft Presidio adapter.

Presidio adds NER-backed PII recognition (names, locations, organizations,
nationalities) that regex cannot reach, plus its own recognizers for many
international identifiers.  We run it *in addition to* the native Korean-tuned
`PIIDetector`: Presidio is strong on English/PII-entity recall, the native
detector on checksum-validated Korean identifiers.  Overlapping spans are
de-duplicated by the engine's category set.

Install to enable:  pip install presidio-analyzer presidio-anonymizer
                     python -m spacy download en_core_web_lg
"""

from __future__ import annotations

import functools
from typing import Any

from ..base import BaseDetector, DetectorResult, Finding, Severity, Stage

# Map Presidio entity types onto our severity model.
_ENTITY_SEVERITY: dict[str, Severity] = {
    "CREDIT_CARD": Severity.CRITICAL,
    "US_SSN": Severity.CRITICAL,
    "IBAN_CODE": Severity.CRITICAL,
    "CRYPTO": Severity.HIGH,
    "PERSON": Severity.MEDIUM,
    "PHONE_NUMBER": Severity.HIGH,
    "EMAIL_ADDRESS": Severity.MEDIUM,
    "IP_ADDRESS": Severity.LOW,
    "LOCATION": Severity.LOW,
    "NRP": Severity.MEDIUM,  # nationality/religion/political group
    "MEDICAL_LICENSE": Severity.HIGH,
    "US_PASSPORT": Severity.HIGH,
    "DATE_TIME": Severity.INFO,
}

_MIN_ENTITY_SCORE = 0.5


@functools.lru_cache(maxsize=1)
def _analyzer() -> Any:
    from presidio_analyzer import AnalyzerEngine

    return AnalyzerEngine()


@functools.lru_cache(maxsize=1)
def presidio_available() -> bool:
    try:
        import presidio_analyzer  # noqa: F401
    except ImportError:
        return False
    try:  # constructing the engine loads the spaCy model — fail closed if absent
        _analyzer()
    except Exception:  # noqa: BLE001
        return False
    return True


class PresidioPIIDetector(BaseDetector):
    """PII detection via Presidio's analyzer, expressed as guardrail findings."""

    name = "presidio_pii"
    stage = Stage.INPUT
    title = "Presidio PII 분석 (NER)"
    description = (
        "Microsoft Presidio의 개체명 인식으로 이름·주소·기관 등 정규식으로 잡기 어려운 "
        "PII를 추가 탐지합니다. 라이브러리가 없으면 내장 PII 탐지기로 대체됩니다."
    )

    def __init__(self, languages: tuple[str, ...] = ("en",)) -> None:
        self._languages = languages

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        if not presidio_available():
            return self._result(
                findings=[],
                context={"presidio": "unavailable"},
            )

        target = context.get("normalized", text)
        findings: list[Finding] = []
        results: list[Any] = []
        for lang in self._languages:
            try:
                results.extend(_analyzer().analyze(text=target, language=lang))
            except Exception:  # noqa: BLE001 - a bad language model shouldn't kill the request
                continue

        for res in results:
            if res.score < _MIN_ENTITY_SCORE:
                continue
            severity = _ENTITY_SEVERITY.get(res.entity_type, Severity.LOW)
            if severity is Severity.INFO:
                continue
            snippet = target[res.start : res.end]
            findings.append(
                Finding(
                    detector=self.name,
                    category=f"pii.presidio.{res.entity_type.lower()}",
                    severity=severity,
                    confidence=float(res.score),
                    message=f"Presidio가 {res.entity_type} 개체를 탐지했습니다.",
                    evidence=("*" * len(snippet)) if len(snippet) <= 40 else snippet[:6] + "…",
                    span=(res.start, res.end),
                    metadata={"engine": "presidio", "entity_type": res.entity_type},
                )
            )

        return self._result(findings=findings, context={"presidio": "ran"})
