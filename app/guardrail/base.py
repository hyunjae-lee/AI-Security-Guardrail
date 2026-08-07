"""Core datatypes shared by every guardrail detector.

A detector inspects one artifact (the user prompt on the way in, or the model
response on the way out) and returns zero or more `Finding`s.  The engine turns
findings into a risk score and a policy `Action`.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol


class Severity(str, Enum):
    """How bad this finding is if it turns out to be real."""

    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

    @property
    def weight(self) -> float:
        return _SEVERITY_WEIGHT[self]


_SEVERITY_WEIGHT: dict[Severity, float] = {
    Severity.INFO: 0.0,
    Severity.LOW: 15.0,
    Severity.MEDIUM: 35.0,
    Severity.HIGH: 65.0,
    Severity.CRITICAL: 100.0,
}


class Action(str, Enum):
    """What the policy engine decided to do with the request."""

    ALLOW = "allow"
    SANITIZE = "sanitize"  # forwarded, but with content rewritten (e.g. PII masked)
    FLAG = "flag"  # forwarded, but recorded for human review
    BLOCK = "block"  # never reaches the model / never reaches the user

    @property
    def rank(self) -> int:
        return _ACTION_RANK[self]


_ACTION_RANK: dict[Action, int] = {
    Action.ALLOW: 0,
    Action.SANITIZE: 1,
    Action.FLAG: 2,
    Action.BLOCK: 3,
}


class Stage(str, Enum):
    """Where in the two pipelines a detector runs."""

    INPUT = "input"
    OUTPUT = "output"


@dataclass(slots=True)
class Finding:
    """One thing a detector noticed.

    `confidence` is the detector's own belief that this is a true positive.  The
    engine multiplies it into the severity weight, so a high-severity pattern
    match with weak evidence does not automatically block.
    """

    detector: str
    category: str
    severity: Severity
    confidence: float
    message: str
    evidence: str = ""
    span: tuple[int, int] | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.confidence = max(0.0, min(1.0, self.confidence))

    @property
    def score(self) -> float:
        return self.severity.weight * self.confidence

    def to_dict(self) -> dict[str, Any]:
        return {
            "detector": self.detector,
            "category": self.category,
            "severity": self.severity.value,
            "confidence": round(self.confidence, 3),
            "message": self.message,
            "evidence": self.evidence,
            "span": list(self.span) if self.span else None,
            "score": round(self.score, 2),
            "metadata": self.metadata,
        }


@dataclass(slots=True)
class DetectorResult:
    """A detector's verdict on one artifact."""

    detector: str
    stage: Stage
    findings: list[Finding] = field(default_factory=list)
    # Set when the detector rewrote the text (PII masking, normalization).
    transformed_text: str | None = None
    duration_ms: float = 0.0
    # Free-form data a later detector may want (e.g. decoded layers).
    context: dict[str, Any] = field(default_factory=dict)

    @property
    def max_score(self) -> float:
        return max((f.score for f in self.findings), default=0.0)

    def to_dict(self) -> dict[str, Any]:
        return {
            "detector": self.detector,
            "stage": self.stage.value,
            "findings": [f.to_dict() for f in self.findings],
            "transformed": self.transformed_text is not None,
            "duration_ms": round(self.duration_ms, 3),
            "max_score": round(self.max_score, 2),
        }


class Detector(Protocol):
    """Interface every guardrail detector implements."""

    name: str
    stage: Stage
    title: str
    description: str

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult: ...


class BaseDetector:
    """Convenience base that handles timing and result construction."""

    name: str = "base"
    stage: Stage = Stage.INPUT
    title: str = "Base"
    description: str = ""

    def run(self, text: str, context: dict[str, Any]) -> DetectorResult:
        started = time.perf_counter()
        result = self.inspect(text, context)
        result.duration_ms = (time.perf_counter() - started) * 1000
        return result

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        raise NotImplementedError

    def _result(self, **kwargs: Any) -> DetectorResult:
        kwargs.setdefault("detector", self.name)
        kwargs.setdefault("stage", self.stage)
        return DetectorResult(**kwargs)
