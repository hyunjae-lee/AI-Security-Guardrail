"""Credential and confidential-material detection.

Covers the direction people forget: users pasting live API keys into a prompt.
Once a key reaches a third-party model provider it must be treated as disclosed,
so these are masked on the way in and blocked on the way out.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Any

from .base import BaseDetector, DetectorResult, Finding, Severity, Stage


@dataclass(frozen=True)
class SecretRule:
    key: str
    label: str
    pattern: re.Pattern[str]
    severity: Severity
    confidence: float
    # Minimum Shannon entropy of the secret body; filters placeholder values
    # like "sk-XXXXXXXXXXXX" or "your-api-key-here".
    min_entropy: float = 0.0


def _entropy(s: str) -> float:
    if not s:
        return 0.0
    counts: dict[str, int] = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    n = len(s)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


RULES: tuple[SecretRule, ...] = (
    SecretRule("anthropic_key", "Anthropic API 키", re.compile(r"\bsk-ant-[A-Za-z0-9_\-]{20,}"), Severity.CRITICAL, 0.97, 3.2),
    SecretRule("openai_key", "OpenAI API 키", re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9]{32,}"), Severity.CRITICAL, 0.95, 3.5),
    SecretRule("github_pat", "GitHub 토큰", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}"), Severity.CRITICAL, 0.97, 3.2),
    SecretRule("aws_akid", "AWS Access Key ID", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"), Severity.CRITICAL, 0.95),
    SecretRule("aws_secret", "AWS Secret Access Key", re.compile(r"(?i)aws.{0,20}secret.{0,20}['\"]?([A-Za-z0-9/+=]{40})['\"]?"), Severity.CRITICAL, 0.9, 4.0),
    SecretRule("google_key", "Google API 키", re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b"), Severity.CRITICAL, 0.95),
    SecretRule("slack_token", "Slack 토큰", re.compile(r"\bxox[baprs]-[0-9A-Za-z\-]{10,}"), Severity.HIGH, 0.9),
    SecretRule("private_key", "개인키 (PEM)", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----"), Severity.CRITICAL, 0.99),
    SecretRule("jwt", "JWT 토큰", re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"), Severity.HIGH, 0.85),
    SecretRule("db_uri", "DB 접속 문자열", re.compile(r"\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis)://[^\s:@]+:[^\s@]+@[^\s/]+"), Severity.CRITICAL, 0.93),
    SecretRule("generic_secret", "하드코딩된 자격증명", re.compile(r"(?i)\b(?:password|passwd|secret|api[_-]?key|token)\s*[=:]\s*['\"]([^'\"\s]{8,})['\"]"), Severity.HIGH, 0.7, 3.0),
)

CONFIDENTIAL_MARKERS = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"\b(?:confidential|proprietary|internal\s+use\s+only|do\s+not\s+distribute)\b",
        r"\b(?:trade\s+secret|classified|restricted\s+distribution)\b",
        r"(?:대외비|사내\s*한정|기밀|비공개\s*자료|배포\s*금지)",
    )
)

_PLACEHOLDER = re.compile(r"(?i)^(?:x+|your[_-]?|example|placeholder|dummy|test|fake|<.*>|\.\.\.)")


class SecretsDetector(BaseDetector):
    """Detect credentials and confidential markers, and redact them."""

    name = "secrets"
    stage = Stage.INPUT
    title = "자격증명 · 기밀정보 탐지"
    description = (
        "API 키, 토큰, 개인키, DB 접속 문자열, 대외비 표기를 탐지합니다. "
        "엔트로피 검사로 'your-api-key' 같은 플레이스홀더는 걸러냅니다."
    )

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        findings: list[Finding] = []
        replacements: list[tuple[int, int, str]] = []

        for rule in RULES:
            for match in rule.pattern.finditer(text):
                body = match.group(1) if rule.pattern.groups else match.group(0)
                span = match.span(1) if rule.pattern.groups else match.span(0)

                if _PLACEHOLDER.match(body):
                    continue
                if rule.min_entropy and _entropy(body) < rule.min_entropy:
                    continue

                findings.append(
                    Finding(
                        detector=self.name,
                        category=f"secret.{rule.key}",
                        severity=rule.severity,
                        confidence=rule.confidence,
                        message=f"{rule.label}가 프롬프트에 포함되어 있습니다. 즉시 폐기·교체가 필요합니다.",
                        evidence=body[:6] + "…" + ("*" * 8),
                        span=span,
                        metadata={"secret_type": rule.key, "entropy": round(_entropy(body), 2)},
                    )
                )
                replacements.append((span[0], span[1], f"[REDACTED:{rule.key.upper()}]"))

        for pattern in CONFIDENTIAL_MARKERS:
            if m := pattern.search(text):
                findings.append(
                    Finding(
                        detector=self.name,
                        category="secret.confidential_marker",
                        severity=Severity.MEDIUM,
                        confidence=0.7,
                        message="기밀/대외비 표기가 포함된 자료를 외부 모델로 전송하려 합니다.",
                        evidence=m.group(0),
                        span=m.span(),
                    )
                )
                break

        sanitized: str | None = None
        if replacements:
            replacements.sort(key=lambda r: r[0], reverse=True)
            buf = text
            for start, end, token in replacements:
                buf = buf[:start] + token + buf[end:]
            sanitized = buf

        return self._result(findings=findings, transformed_text=sanitized)


class SecretsLeakDetector(SecretsDetector):
    """Credentials appearing in the model's response — always a block."""

    name = "secrets_leak"
    stage = Stage.OUTPUT
    title = "응답 내 자격증명 유출 검사"
    description = "모델이 시스템 프롬프트나 컨텍스트에 있던 자격증명을 그대로 노출했는지 검사합니다."
