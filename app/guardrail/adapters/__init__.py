"""Optional integrations with third-party guardrail engines.

Each adapter implements the same `Detector` protocol as the built-in detectors,
so the engine treats them uniformly.  They are *optional*: if the underlying
library is not installed, the adapter reports itself unavailable and the engine
falls back to the native detectors.  This keeps the demo image and CI lightweight
while making the integration real when the libraries are present.

Enable via environment flags (see `app/config.py`):
    GUARDRAIL_USE_PRESIDIO=1   # Microsoft Presidio for PII/NER
    GUARDRAIL_USE_NEMO=1       # NVIDIA NeMo Guardrails rails
"""

from __future__ import annotations

from .nemo import NeMoRailsDetector, nemo_available
from .presidio import PresidioPIIDetector, presidio_available

__all__ = [
    "NeMoRailsDetector",
    "PresidioPIIDetector",
    "nemo_available",
    "presidio_available",
]
