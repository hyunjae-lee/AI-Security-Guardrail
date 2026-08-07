"""PII detection and masking, tuned for Korean personal data.

Regex alone produces far too many false positives on 13-digit numbers, so every
identifier that carries a checksum (주민등록번호, 사업자등록번호, credit cards) is
validated before it is reported.  A pattern match without a valid checksum is
still reported, but at lower severity and confidence, so the policy engine can
mask it without blocking the whole request.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from .base import BaseDetector, DetectorResult, Finding, Severity, Stage


def _luhn_valid(digits: str) -> bool:
    total, parity = 0, len(digits) % 2
    for i, ch in enumerate(digits):
        d = int(ch)
        if i % 2 == parity:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def _rrn_valid(digits: str) -> bool:
    """주민등록번호 check digit (13 digits, weights 2..9,2..5)."""
    if len(digits) != 13:
        return False
    month, day = int(digits[2:4]), int(digits[4:6])
    if not (1 <= month <= 12 and 1 <= day <= 31):
        return False
    if digits[6] not in "1234":  # gender/century marker
        return False
    weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5]
    total = sum(int(d) * w for d, w in zip(digits[:12], weights, strict=False))
    return (11 - (total % 11)) % 10 == int(digits[12])


def _brn_valid(digits: str) -> bool:
    """사업자등록번호 check digit (10 digits)."""
    if len(digits) != 10:
        return False
    weights = [1, 3, 7, 1, 3, 7, 1, 3, 5]
    total = sum(int(d) * w for d, w in zip(digits[:9], weights, strict=False))
    total += (int(digits[8]) * 5) // 10
    return (10 - (total % 10)) % 10 == int(digits[9])


@dataclass(frozen=True)
class PIIRule:
    key: str
    label: str
    pattern: re.Pattern[str]
    severity: Severity
    confidence: float
    # Optional checksum over the digits of the match; None means no validation.
    validator: Callable[[str], bool] | None = None
    # Confidence when the pattern matches but the checksum fails.
    weak_confidence: float = 0.3
    keep_tail: int = 0  # how many trailing chars to keep when masking
    # When the pattern has a capture group, whether to report/redact that group
    # (True, e.g. account number after a keyword) or the whole match (False,
    # e.g. a hyphenated RRN whose halves are separate groups).
    use_group: bool = False


RULES: tuple[PIIRule, ...] = (
    PIIRule(
        key="rrn",
        label="주민등록번호",
        pattern=re.compile(r"\b(\d{6})[-\s]?([1-4]\d{6})\b"),
        severity=Severity.CRITICAL,
        confidence=0.97,
        validator=_rrn_valid,
        weak_confidence=0.35,
    ),
    PIIRule(
        key="credit_card",
        label="신용카드번호",
        pattern=re.compile(r"\b(?:\d[ -]?){13,19}\b"),
        severity=Severity.CRITICAL,
        confidence=0.95,
        validator=_luhn_valid,
        weak_confidence=0.2,
        keep_tail=4,
    ),
    PIIRule(
        key="business_no",
        label="사업자등록번호",
        pattern=re.compile(r"\b\d{3}-?\d{2}-?\d{5}\b"),
        severity=Severity.MEDIUM,
        confidence=0.85,
        validator=_brn_valid,
        weak_confidence=0.25,
    ),
    PIIRule(
        key="phone_kr",
        label="휴대전화번호",
        pattern=re.compile(r"\b01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}\b"),
        severity=Severity.HIGH,
        confidence=0.9,
        keep_tail=4,
    ),
    PIIRule(
        key="phone_landline",
        label="유선전화번호",
        pattern=re.compile(r"\b0(?:2|3[1-3]|4[1-4]|5[1-5]|6[1-4])[-.\s]?\d{3,4}[-.\s]?\d{4}\b"),
        severity=Severity.MEDIUM,
        confidence=0.75,
        keep_tail=4,
    ),
    PIIRule(
        key="email",
        label="이메일",
        pattern=re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b"),
        severity=Severity.MEDIUM,
        confidence=0.9,
    ),
    PIIRule(
        key="account_no",
        label="계좌번호",
        pattern=re.compile(
            r"(?:계좌|입금|송금|account)\D{0,12}(\d{2,6}[-\s]\d{2,6}[-\s]\d{2,8})",
            re.IGNORECASE,
        ),
        severity=Severity.HIGH,
        confidence=0.8,
        keep_tail=4,
        use_group=True,
    ),
    PIIRule(
        key="passport_kr",
        label="여권번호",
        pattern=re.compile(r"\b[MSRODmsrod]\d{8}\b"),
        severity=Severity.HIGH,
        confidence=0.6,
    ),
    PIIRule(
        key="ipv4",
        label="IP 주소",
        pattern=re.compile(
            r"\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}"
            r"(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b"
        ),
        severity=Severity.LOW,
        confidence=0.7,
    ),
)

# Version strings and dotted decimals that look like IPs but aren't interesting.
_IP_ALLOWLIST = re.compile(r"^(?:0\.0\.0\.0|127\.0\.0\.1|255\.255\.255\.255)$")


def _mask(value: str, keep_tail: int) -> str:
    if keep_tail <= 0:
        return "*" * len(value)
    visible = value[-keep_tail:]
    return "*" * max(0, len(value) - keep_tail) + visible


class PIIDetector(BaseDetector):
    """Find and mask personal data before it reaches the model."""

    name = "pii"
    stage = Stage.INPUT
    title = "개인정보 탐지 / 마스킹"
    description = (
        "주민등록번호·카드번호·연락처·계좌·이메일 등을 탐지합니다. 체크섬이 있는 "
        "식별자는 검증까지 수행해 오탐을 줄이고, 통과된 항목은 마스킹 후 전달합니다."
    )

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        findings: list[Finding] = []
        # Collect replacements against the *original* text so the sanitized
        # prompt stays readable; overlapping matches resolve longest-first.
        replacements: list[tuple[int, int, str]] = []
        seen_spans: set[tuple[int, int]] = set()

        for rule in RULES:
            for match in rule.pattern.finditer(text):
                if rule.use_group and rule.pattern.groups and match.group(1):
                    raw, span = match.group(1), match.span(1)
                else:
                    raw, span = match.group(0), match.span(0)
                if span in seen_spans:
                    continue

                digits = re.sub(r"\D", "", raw)
                valid = True
                confidence = rule.confidence
                if rule.validator is not None:
                    valid = rule.validator(digits)
                    if not valid:
                        confidence = rule.weak_confidence

                if rule.key == "ipv4" and _IP_ALLOWLIST.match(raw):
                    continue
                # A 13-19 digit run that fails Luhn is usually an order number.
                if rule.key == "credit_card" and not valid:
                    continue

                seen_spans.add(span)
                severity = rule.severity if valid else Severity.LOW
                findings.append(
                    Finding(
                        detector=self.name,
                        category=f"pii.{rule.key}",
                        severity=severity,
                        confidence=confidence,
                        message=(
                            f"{rule.label} 발견"
                            + ("" if rule.validator is None else (" (체크섬 유효)" if valid else " (체크섬 불일치, 오탐 가능)"))
                        ),
                        evidence=_mask(raw, rule.keep_tail),
                        span=span,
                        metadata={"pii_type": rule.key, "checksum_valid": valid},
                    )
                )
                replacements.append((span[0], span[1], f"[REDACTED:{rule.key.upper()}]"))

        sanitized: str | None = None
        if replacements:
            replacements.sort(key=lambda r: r[0], reverse=True)
            buf = text
            for start, end, token in replacements:
                buf = buf[:start] + token + buf[end:]
            sanitized = buf

        return self._result(
            findings=findings,
            transformed_text=sanitized,
            context={"pii_masked_count": len(replacements)},
        )


class PIILeakDetector(PIIDetector):
    """Same rules, applied to the model's response.

    A model echoing a 주민등록번호 back to the user is a data-leak incident even
    if the user supplied it, so output-side hits are never merely masked — the
    engine escalates them.
    """

    name = "pii_leak"
    stage = Stage.OUTPUT
    title = "응답 내 개인정보 유출 검사"
    description = "모델 응답에 개인정보가 포함되어 사용자에게 반환되는지 검사합니다."
