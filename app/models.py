"""Request/response schemas for the HTTP API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .guardrail import DEFAULT_PROFILE


class AnalyzeRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=100_000)
    profile: str = Field(default=DEFAULT_PROFILE)
    backend: Literal["mock", "claude"] = Field(default="mock")
    # When false the demo skips the unguarded lane (useful for API-only use).
    compare: bool = True
    animate: bool = True


class InspectRequest(BaseModel):
    """Guardrail-only check: no model call, just the input pipeline."""

    text: str = Field(..., min_length=1, max_length=100_000)
    profile: str = Field(default=DEFAULT_PROFILE)
    stage: Literal["input", "output"] = "input"
