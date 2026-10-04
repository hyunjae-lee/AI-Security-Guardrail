"""Optional integrations with third-party guardrail engines.

Each adapter implements the same `Detector` protocol as the built-in detectors,
so the engine treats them uniformly.  They are *optional*: if the underlying
library is not installed, the adapter reports itself unavailable and the engine
falls back to the native detectors.  This keeps the demo image and CI lightweight
while making the integration real when the libraries are present.

Enable via environment flags (see `app/config.py`):
    GUARDRAIL_USE_PRESIDIO=1   # Microsoft Presidio for PII/NER (en + ko)
    GUARDRAIL_PRESIDIO_LANGS=en,ko  # 분석 언어. 기본 en,ko
    GUARDRAIL_USE_NEMO=1       # NVIDIA NeMo Guardrails rails
    GUARDRAIL_USE_PI_MODEL=1   # ONNX 프롬프트 인젝션 분류기 (한국어 성능 실측 후 판단)
"""

from __future__ import annotations

from .korean_ner import analyze_korean, korean_ner_available
from .nemo import NeMoRailsDetector, nemo_available
from .presidio import PresidioPIIDetector, presidio_available
from .transformer_injection import TransformerInjectionDetector, pi_model_available

__all__ = [
    "NeMoRailsDetector",
    "PresidioPIIDetector",
    "TransformerInjectionDetector",
    "analyze_korean",
    "korean_ner_available",
    "nemo_available",
    "pi_model_available",
    "presidio_available",
]
