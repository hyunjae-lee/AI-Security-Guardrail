"""Pluggable model backends for the protected AI system."""

from __future__ import annotations

from .base import LLMClient, LLMResponse
from .mock import MockVulnerableLLM

__all__ = ["LLMClient", "LLMResponse", "MockVulnerableLLM", "get_backend", "available_backends"]


def available_backends() -> list[dict[str, object]]:
    from . import claude

    return [
        {
            "id": "mock",
            "label": "모의 취약 모델 (Mock)",
            "available": True,
            "description": "재현 가능한 데모용. 인젝션에 순순히 따르고 시스템 프롬프트를 유출합니다.",
        },
        {
            "id": "claude",
            "label": f"Claude ({claude.DEFAULT_MODEL})",
            "available": claude.is_available(),
            "description": "실제 Anthropic API 호출. 자체 안전장치가 있어 무가드레일 경로도 거절할 수 있습니다.",
        },
    ]


def get_backend(backend_id: str) -> LLMClient:
    if backend_id == "claude":
        from .claude import ClaudeLLM

        return ClaudeLLM()
    return MockVulnerableLLM()
