"""Structural anomaly detection.

These signals carry no semantics — they describe the *shape* of the prompt.  A
40 KB wall of repeated tokens is a context-exhaustion attempt regardless of what
the tokens say, and a prompt that is 60% Cyrillic when the user is Korean is a
homoglyph-evasion attempt regardless of which words it spells.
"""

from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter
from typing import Any

from .base import BaseDetector, DetectorResult, Finding, Severity, Stage

MAX_CHARS = 20_000
REPETITION_THRESHOLD = 0.55  # share of text taken by one repeated n-gram
SUSPICIOUS_SCRIPT_RATIO = 0.15  # share of chars from an unexpected script
MIN_LEN_FOR_SHAPE_CHECKS = 40

_EXPECTED_SCRIPTS = {"LATIN", "HANGUL", "CJK", "COMMON", "DIGIT"}


def _script_of(ch: str) -> str:
    if ch.isdigit():
        return "DIGIT"
    if not ch.isalpha():
        return "COMMON"
    try:
        name = unicodedata.name(ch)
    except ValueError:
        return "UNKNOWN"
    for script in ("HANGUL", "CJK", "LATIN", "CYRILLIC", "GREEK", "ARABIC", "HEBREW", "THAI"):
        if name.startswith(script):
            return script
    return "OTHER"


def _max_ngram_share(text: str, n: int = 12) -> tuple[float, str]:
    """Fraction of the text covered by its single most-repeated n-gram.

    Uses a step-1 sliding window so a short repeated unit (e.g. a 7-char phrase)
    is fully counted; a coarser step under-counts each phase of the period and
    misses real floods.  Capped at 1.0 since overlapping windows can exceed it.
    """
    if len(text) < n * 3:
        return 0.0, ""
    grams = Counter(text[i : i + n] for i in range(0, len(text) - n))
    gram, count = grams.most_common(1)[0]
    return min(1.0, (count * n) / len(text)), gram


def _shannon(text: str) -> float:
    if not text:
        return 0.0
    counts = Counter(text)
    n = len(text)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


class AnomalyDetector(BaseDetector):
    """Length bombs, repetition floods, and script mixing."""

    name = "anomaly"
    stage = Stage.INPUT
    title = "구조적 이상 탐지"
    description = (
        "입력 길이 폭탄, 동일 문자열 반복을 이용한 컨텍스트 고갈, 예상치 못한 문자 체계 "
        "혼합, 비정상 엔트로피 등 내용과 무관한 구조적 공격 신호를 탐지합니다."
    )

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        findings: list[Finding] = []
        length = len(text)

        if length > MAX_CHARS:
            findings.append(
                Finding(
                    detector=self.name,
                    category="anomaly.length_bomb",
                    severity=Severity.HIGH,
                    confidence=0.9,
                    message=f"입력이 허용 한도({MAX_CHARS:,}자)를 초과했습니다 ({length:,}자).",
                    metadata={"length": length, "limit": MAX_CHARS},
                )
            )

        if length >= MIN_LEN_FOR_SHAPE_CHECKS:
            share, gram = _max_ngram_share(text)
            if share >= REPETITION_THRESHOLD:
                findings.append(
                    Finding(
                        detector=self.name,
                        category="anomaly.repetition_flood",
                        severity=Severity.MEDIUM,
                        confidence=min(0.95, share),
                        message=(
                            f"동일 패턴이 입력의 {share:.0%}를 차지합니다. "
                            "컨텍스트 고갈 또는 필터 우회 시도일 수 있습니다."
                        ),
                        evidence=gram.strip()[:60],
                        metadata={"share": round(share, 3)},
                    )
                )

            scripts = Counter(_script_of(ch) for ch in text if ch.isalpha())
            total_alpha = sum(scripts.values())
            if total_alpha >= 20:
                for script, count in scripts.items():
                    ratio = count / total_alpha
                    if script not in _EXPECTED_SCRIPTS and ratio >= SUSPICIOUS_SCRIPT_RATIO:
                        findings.append(
                            Finding(
                                detector=self.name,
                                category="anomaly.script_mixing",
                                severity=Severity.MEDIUM,
                                confidence=min(0.9, 0.4 + ratio),
                                message=(
                                    f"{script} 문자가 전체 알파벳의 {ratio:.0%}를 차지합니다. "
                                    "호모글리프 우회 가능성이 있습니다."
                                ),
                                metadata={"script": script, "ratio": round(ratio, 3)},
                            )
                        )

            entropy = _shannon(text)
            if entropy > 5.2 and length > 200:
                findings.append(
                    Finding(
                        detector=self.name,
                        category="anomaly.high_entropy",
                        severity=Severity.LOW,
                        confidence=0.5,
                        message=f"엔트로피가 비정상적으로 높습니다 ({entropy:.2f}). 인코딩된 페이로드일 수 있습니다.",
                        metadata={"entropy": round(entropy, 2)},
                    )
                )

        # Many separate instruction-looking lines is a smuggling shape.
        directive_lines = len(re.findall(r"^\s*(?:system|assistant|user|instruction)\s*[:：]", text, re.I | re.M))
        if directive_lines >= 3:
            findings.append(
                Finding(
                    detector=self.name,
                    category="anomaly.fake_transcript",
                    severity=Severity.HIGH,
                    confidence=0.8,
                    message=f"대화 기록을 위조한 듯한 역할 표기 줄이 {directive_lines}개 발견되었습니다.",
                    metadata={"directive_lines": directive_lines},
                )
            )

        return self._result(
            findings=findings,
            context={"input_length": length, "entropy": round(_shannon(text), 2)},
        )
