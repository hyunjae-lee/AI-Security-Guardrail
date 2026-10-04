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
import os
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

# 어떤 언어로 분석할지. 기본값이 영어뿐이면 한국어 도메인에서 아무 기여도 못 한다.
LANGUAGES: tuple[str, ...] = tuple(
    s.strip() for s in os.environ.get("GUARDRAIL_PRESIDIO_LANGS", "en,ko").split(",") if s.strip()
)

_MIN_ENTITY_SCORE = 0.5

# 이 비율 이상 한글이면 한국어 문서로 본다.
_HANGUL_RATIO_FOR_KO = 0.15


def _hangul_ratio(text: str) -> float:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for c in letters if "\uac00" <= c <= "\ud7a3") / len(letters)


def _languages_for(text: str, configured: tuple[str, ...]) -> list[str]:
    """글자 체계를 보고 **어느 분석기에 보낼지** 고른다.

    설정된 언어를 전부 돌리면 안 된다.  영어 spaCy NER 에 한국어 문장을 넣으면
    아무 데서나 PERSON 을 뱉는다 — 「졸업논문 제출 마감일과 양식을 알려주세요」가
    PERSON 으로 잡혔다(scripts/eval.py 실측, 정상 질의 22건이 이렇게 오염됐다).
    언어를 섞어 돌리는 것이 아니라 **갈라 보내는 것**이 맞다.
    """
    ko_like = _hangul_ratio(text) >= _HANGUL_RATIO_FOR_KO
    if ko_like:
        return [lang for lang in configured if lang == "ko"]
    return [lang for lang in configured if lang != "ko"]


@functools.lru_cache(maxsize=1)
def _analyzer() -> Any:
    from presidio_analyzer import AnalyzerEngine

    return AnalyzerEngine()


@functools.lru_cache(maxsize=1)
def english_available() -> bool:
    """영어 분석기(기본 spaCy 모델 필요)가 뜨는가."""
    try:
        import presidio_analyzer  # noqa: F401
    except ImportError:
        return False
    try:  # constructing the engine loads the spaCy model — fail closed if absent
        _analyzer()
    except Exception:  # noqa: BLE001
        return False
    return True


@functools.lru_cache(maxsize=1)
def presidio_available() -> bool:
    """**언어별로** 따진다.

    예전에는 영어 분석기가 안 뜨면 어댑터 전체가 꺼졌다.  영어 spaCy 모델
    (`en_core_web_lg`)은 수백 MB 라 설치돼 있지 않은 환경이 흔한데, 그 때문에
    한국어 NER 까지 함께 꺼지는 것은 이 프로젝트 도메인에서 손해가 크다.
    """
    from .korean_ner import korean_ner_available

    return ("en" in LANGUAGES and english_available()) or (
        "ko" in LANGUAGES and korean_ner_available()
    )


class PresidioPIIDetector(BaseDetector):
    """PII detection via Presidio's analyzer, expressed as guardrail findings."""

    name = "presidio_pii"
    stage = Stage.INPUT
    title = "Presidio PII 분석 (NER)"
    description = (
        "Microsoft Presidio의 개체명 인식으로 이름·주소 등 정규식으로 잡기 어려운 "
        "PII를 추가 탐지합니다. 한국어는 KoELECTRA NER 인식기를 Presidio에 등록해 "
        "mecab 없이 동작합니다. 라이브러리가 없으면 내장 PII 탐지기로 대체됩니다."
    )

    def __init__(self, languages: tuple[str, ...] | None = None) -> None:
        # 기본값을 ("en",) 으로 **고정해 두는 바람에** 한국어 문서에서 사실상
        # 아무것도 못 잡고 있었다. 환경변수로 받고 기본은 en+ko 로 둔다.
        self._languages = languages if languages is not None else LANGUAGES

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        if not presidio_available():
            return self._result(
                findings=[],
                context={"presidio": "unavailable"},
            )

        target = context.get("normalized", text)
        findings: list[Finding] = []
        results: list[Any] = []
        for lang in _languages_for(target, tuple(self._languages)):
            if lang == "ko":
                from .korean_ner import analyze_korean

                results.extend(analyze_korean(target))
                continue
            if not english_available():
                continue
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
