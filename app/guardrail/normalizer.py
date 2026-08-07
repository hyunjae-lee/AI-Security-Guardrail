"""Obfuscation normalizer.

Attackers rarely send `ignore previous instructions` verbatim.  They base64 it,
insert zero-width joiners, swap Cyrillic homoglyphs, or space it o u t.  Every
later detector runs against the *normalized* text produced here, so a single
regex catches all those variants instead of needing one pattern per trick.

The layers themselves are also evidence: text that only became suspicious after
base64 decoding is more likely hostile than text that was suspicious in plain
sight, so each applied transform emits a low-severity finding of its own.
"""

from __future__ import annotations

import base64
import binascii
import re
import unicodedata
from typing import Any

from .base import BaseDetector, DetectorResult, Finding, Severity, Stage

# Characters with no visual rendering that split keywords apart.
_INVISIBLE = re.compile(
    "[​-‏‪-‮⁠-⁤﻿­᠎]"
)

# Cyrillic/Greek lookalikes mapped to their ASCII twin.
_HOMOGLYPHS = str.maketrans(
    {
        "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y",
        "і": "i", "ѕ": "s", "ԁ": "d", "ո": "n", "ｇ": "g",
        "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K",
        "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X",
        "ο": "o", "α": "a", "ι": "i",
    }
)

_LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s"})

_B64_CANDIDATE = re.compile(r"[A-Za-z0-9+/]{20,}={0,2}")
_HEX_CANDIDATE = re.compile(r"(?:[0-9a-fA-F]{2}[\s:]?){12,}")
_URL_ENCODED = re.compile(r"(?:%[0-9a-fA-F]{2}){4,}")

# Only treat a decode as meaningful if it produced mostly printable text.
_PRINTABLE_RATIO = 0.85


def _mostly_printable(s: str) -> bool:
    if not s:
        return False
    printable = sum(1 for ch in s if ch.isprintable() or ch in "\n\t ")
    return printable / len(s) >= _PRINTABLE_RATIO


def _try_base64(token: str) -> str | None:
    if len(token) % 4:
        token = token + "=" * (-len(token) % 4)
    try:
        raw = base64.b64decode(token, validate=True)
    except (binascii.Error, ValueError):
        return None
    try:
        decoded = raw.decode("utf-8")
    except UnicodeDecodeError:
        return None
    return decoded if _mostly_printable(decoded) and len(decoded) >= 6 else None


def _try_hex(token: str) -> str | None:
    cleaned = re.sub(r"[\s:]", "", token)
    if len(cleaned) % 2:
        return None
    try:
        decoded = bytes.fromhex(cleaned).decode("utf-8")
    except (ValueError, UnicodeDecodeError):
        return None
    return decoded if _mostly_printable(decoded) and len(decoded) >= 6 else None


def _try_url(token: str) -> str | None:
    from urllib.parse import unquote

    decoded = unquote(token)
    return decoded if decoded != token and _mostly_printable(decoded) else None


class Normalizer(BaseDetector):
    """Decode obfuscation layers and expose a canonical form to later stages."""

    name = "normalizer"
    stage = Stage.INPUT
    title = "정규화 / 난독화 해제"
    description = (
        "유니코드 제로위드스페이스, 호모글리프, base64/hex/URL 인코딩, 과도한 공백을 "
        "제거해 후속 탐지기가 우회 없이 동작하도록 만듭니다."
    )

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        findings: list[Finding] = []
        layers: list[str] = []
        working = text

        # 1. Unicode normalization (NFKC folds fullwidth/compat forms to ASCII).
        nfkc = unicodedata.normalize("NFKC", working)
        if nfkc != working:
            layers.append("unicode-nfkc")
            working = nfkc

        # 2. Strip invisible control/formatting characters.
        stripped = _INVISIBLE.sub("", working)
        if stripped != working:
            findings.append(
                Finding(
                    detector=self.name,
                    category="obfuscation.invisible_chars",
                    severity=Severity.MEDIUM,
                    confidence=0.8,
                    message="보이지 않는 제어 문자(zero-width/BiDi)가 발견되어 제거했습니다.",
                    evidence=f"{len(working) - len(stripped)}자 제거",
                )
            )
            layers.append("invisible-strip")
            working = stripped

        # 3. Homoglyph folding.
        folded = working.translate(_HOMOGLYPHS)
        if folded != working:
            findings.append(
                Finding(
                    detector=self.name,
                    category="obfuscation.homoglyph",
                    severity=Severity.MEDIUM,
                    confidence=0.75,
                    message="키릴/그리스 문자로 위장한 라틴 문자가 발견되어 치환했습니다.",
                )
            )
            layers.append("homoglyph-fold")
            working = folded

        # 4. Encoded payloads. Decoded content is appended so keyword detectors
        #    see it, while the original text is left intact for display.
        decoded_parts: list[str] = []
        for pattern, decoder, label in (
            (_B64_CANDIDATE, _try_base64, "base64"),
            (_HEX_CANDIDATE, _try_hex, "hex"),
            (_URL_ENCODED, _try_url, "url"),
        ):
            for match in pattern.finditer(working):
                decoded = decoder(match.group(0))
                if not decoded:
                    continue
                decoded_parts.append(decoded)
                layers.append(label)
                findings.append(
                    Finding(
                        detector=self.name,
                        category=f"obfuscation.{label}",
                        severity=Severity.MEDIUM,
                        confidence=0.7,
                        message=f"{label} 인코딩된 페이로드를 디코딩했습니다.",
                        evidence=decoded[:120],
                        span=match.span(),
                        metadata={"decoded": decoded[:500]},
                    )
                )

        # 5. Collapse spacing tricks ("i g n o r e", "ignore....previous").
        collapsed = re.sub(r"[ \t]{2,}", " ", working)
        collapsed = re.sub(r"(?<=\b\w) (?=\w\b)", "", collapsed)
        collapsed = re.sub(r"\n{3,}", "\n\n", collapsed)
        if collapsed != working:
            layers.append("space-collapse")

        normalized = collapsed
        if decoded_parts:
            normalized = normalized + "\n" + "\n".join(decoded_parts)

        leet = normalized.lower().translate(_LEET)

        return self._result(
            findings=findings,
            transformed_text=normalized if normalized != text else None,
            context={
                "normalized": normalized,
                "leet": leet,
                "layers": layers,
                "decoded_payloads": decoded_parts,
            },
        )
