"""Real Claude backend.

Optional: used only when ANTHROPIC_API_KEY (or an `ant auth login` profile) is
available.  Note that a real model has its own safety training, so the
"no guardrail" lane will often refuse on its own — which is worth showing, but
makes a poorer before/after contrast than the mock.  Both lanes are measured
either way.
"""

from __future__ import annotations

import time

from .base import LLMResponse

DEFAULT_MODEL = "claude-opus-5"


class ClaudeLLM:
    """Thin async wrapper over the Anthropic Messages API."""

    name = DEFAULT_MODEL

    def __init__(self, model: str = DEFAULT_MODEL, max_tokens: int = 4096) -> None:
        self.name = model
        self._model = model
        self._max_tokens = max_tokens
        self._client = None

    def _ensure_client(self):
        if self._client is None:
            from anthropic import AsyncAnthropic

            # Zero-arg constructor resolves ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN,
            # or an `ant auth login` profile — don't require an explicit key.
            self._client = AsyncAnthropic()
        return self._client

    async def complete(self, prompt: str, system: str) -> LLMResponse:
        started = time.perf_counter()
        try:
            client = self._ensure_client()
            response = await client.messages.create(
                model=self._model,
                max_tokens=self._max_tokens,
                system=system,
                # Adaptive thinking is on by default on Opus 5; keeping effort low
                # holds demo latency down without disabling thinking entirely.
                output_config={"effort": "low"},
                messages=[{"role": "user", "content": prompt}],
            )
        except Exception as exc:  # noqa: BLE001 - surfaced to the UI, not swallowed
            return LLMResponse(
                text="",
                model=self._model,
                latency_ms=(time.perf_counter() - started) * 1000,
                error=f"{type(exc).__name__}: {exc}",
            )

        latency = (time.perf_counter() - started) * 1000

        # Check stop_reason before reading content — a refusal returns HTTP 200
        # with an empty (or partial) content array.
        if response.stop_reason == "refusal":
            details = getattr(response, "stop_details", None)
            category = getattr(details, "category", None) if details else None
            return LLMResponse(
                text="",
                model=response.model,
                latency_ms=latency,
                refused=True,
                stop_reason="refusal",
                usage={"category": category},
            )

        text = "".join(block.text for block in response.content if block.type == "text")
        return LLMResponse(
            text=text,
            model=response.model,
            latency_ms=latency,
            refused=False,
            stop_reason=response.stop_reason,
            usage={
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
        )


def is_available() -> bool:
    """True when the anthropic SDK is importable and a credential is resolvable."""
    try:
        import anthropic  # noqa: F401
    except ImportError:
        return False

    import os

    if os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"):
        return True
    # An `ant auth login` profile also works with the zero-arg client.
    config_dir = os.environ.get("ANTHROPIC_CONFIG_DIR") or os.path.expanduser(
        "~/.config/anthropic"
    )
    return os.path.isdir(os.path.join(config_dir, "credentials"))
