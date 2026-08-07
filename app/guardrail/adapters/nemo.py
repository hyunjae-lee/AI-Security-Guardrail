"""NVIDIA NeMo Guardrails adapter.

NeMo Guardrails runs Colang-defined rails (topical control, jailbreak checks,
self-check input/output) around an LLM.  Here we use it purely as an *input
classifier*: the adapter asks a configured NeMo rails app whether the prompt
should be allowed, and turns a refusal into a guardrail finding.  The rest of
our pipeline (PII masking, scoring, audit) still runs, so NeMo augments rather
than replaces the native rails.

Install to enable:  pip install nemoguardrails
Set the rails config directory via GUARDRAIL_NEMO_CONFIG (defaults to the bundled
minimal config).  Note NeMo's self-check rails typically call an LLM, so this
adapter adds latency and requires a model credential — it is off by default.
"""

from __future__ import annotations

import functools
import os
from typing import Any

from ..base import BaseDetector, DetectorResult, Finding, Severity, Stage

_DEFAULT_CONFIG = os.path.join(os.path.dirname(__file__), "nemo_config")


@functools.lru_cache(maxsize=1)
def nemo_available() -> bool:
    try:
        import nemoguardrails  # noqa: F401
    except ImportError:
        return False
    return True


@functools.lru_cache(maxsize=1)
def _rails(config_path: str) -> Any:
    from nemoguardrails import LLMRails, RailsConfig

    config = RailsConfig.from_path(config_path)
    return LLMRails(config)


# Phrases a NeMo self-check / refusal rail typically emits.
_BLOCK_MARKERS = (
    "i can't respond to that",
    "i'm not able to help",
    "i cannot assist",
    "blocked by",
    "violates",
    "not allowed",
)


class NeMoRailsDetector(BaseDetector):
    """Bridge a NeMo Guardrails rails app into a guardrail finding."""

    name = "nemo_rails"
    stage = Stage.INPUT
    title = "NeMo Guardrails 레일"
    description = (
        "NVIDIA NeMo Guardrails의 입력 레일(주제 제어·탈옥 자가검사)을 실행해 차단 판정 시 "
        "finding으로 변환합니다. 라이브러리/설정이 없으면 자동으로 비활성화됩니다."
    )

    def __init__(self, config_path: str | None = None) -> None:
        self._config_path = config_path or os.environ.get("GUARDRAIL_NEMO_CONFIG", _DEFAULT_CONFIG)

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        if not nemo_available() or not os.path.isdir(self._config_path):
            return self._result(findings=[], context={"nemo": "unavailable"})

        findings: list[Finding] = []
        try:
            rails = _rails(self._config_path)
            result = rails.generate(messages=[{"role": "user", "content": text}])
            answer = (result.get("content") if isinstance(result, dict) else str(result)) or ""
        except Exception as exc:  # noqa: BLE001 - degrade to native rails on any error
            return self._result(findings=[], context={"nemo": f"error:{type(exc).__name__}"})

        lowered = answer.lower()
        if any(marker in lowered for marker in _BLOCK_MARKERS):
            findings.append(
                Finding(
                    detector=self.name,
                    category="policy.nemo_rail_block",
                    severity=Severity.HIGH,
                    confidence=0.8,
                    message="NeMo Guardrails 입력 레일이 이 요청을 차단 대상으로 판정했습니다.",
                    evidence=answer[:160],
                    metadata={"engine": "nemo"},
                )
            )

        return self._result(findings=findings, context={"nemo": "ran"})
