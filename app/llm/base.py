"""LLM adapter interface.

The PoC needs the protected system to be *swappable*: a deterministic mock for
reproducible demos and CI, and a real Claude call when an API key is present.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass(slots=True)
class LLMResponse:
    text: str
    model: str
    latency_ms: float = 0.0
    refused: bool = False
    stop_reason: str | None = None
    usage: dict[str, Any] = field(default_factory=dict)
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "text": self.text,
            "model": self.model,
            "latency_ms": round(self.latency_ms, 2),
            "refused": self.refused,
            "stop_reason": self.stop_reason,
            "usage": self.usage,
            "error": self.error,
        }


class LLMClient(Protocol):
    name: str

    async def complete(self, prompt: str, system: str) -> LLMResponse: ...
