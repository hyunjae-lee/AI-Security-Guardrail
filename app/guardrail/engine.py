"""Guardrail pipeline orchestration, risk scoring, and policy decisions.

Two pipelines run around the model call:

    user prompt ─▶ [INPUT stages] ─▶ model ─▶ [OUTPUT stages] ─▶ user

Each stage may transform the text (normalization, PII masking), and every stage
contributes findings.  The engine converts findings into a single risk score and
then into an `Action`.

Scoring is deliberately *not* a sum.  Summing lets five LOW findings outweigh one
CRITICAL, and makes the score unbounded and meaningless.  Instead the highest
finding sets the floor and every additional finding adds a sharply discounted
amount, so the score answers "how bad is the worst thing here, and is there
corroboration?" — which is the question a reviewer actually asks.
"""

from __future__ import annotations

import asyncio
import secrets
import time
import uuid
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from typing import Any

from .anomaly import AnomalyDetector
from .base import Action, BaseDetector, DetectorResult, Finding, Stage
from .harmful import HarmfulContentDetector, HarmfulOutputDetector
from .injection import InjectionDetector
from .normalizer import Normalizer
from .output import CanaryLeakDetector, ExfiltrationDetector, RefusalConsistencyDetector
from .pii import PIIDetector, PIILeakDetector
from .secrets import SecretsDetector, SecretsLeakDetector

# Additional findings beyond the top one contribute at this decay per rank.
_CORROBORATION_DECAY = 0.45
_MAX_SCORE = 100.0


@dataclass(frozen=True)
class PolicyProfile:
    """Thresholds that turn a risk score into an action."""

    name: str
    label: str
    sanitize_at: float
    flag_at: float
    block_at: float
    # Categories blocked regardless of score (no legitimate framing exists).
    always_block: frozenset[str] = frozenset()
    # Categories that never block, only mask (mask-and-forward is the point).
    never_block: frozenset[str] = frozenset()
    description: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "label": self.label,
            "sanitize_at": self.sanitize_at,
            "flag_at": self.flag_at,
            "block_at": self.block_at,
            "always_block": sorted(self.always_block),
            "never_block": sorted(self.never_block),
            "description": self.description,
        }


_HARD_BLOCK = frozenset({"harmful.csam", "harmful.self_harm", "harmful.weapons"})
# Prefixes whose findings are neutralized by masking, so the request is
# sanitized-and-forwarded rather than blocked. `pii.` covers every PII subtype:
# masking removes the identifier, so forwarding the masked prompt is safe.
_MASK_ONLY = frozenset({"pii.", "obfuscation."})


def _category_in(category: str, groups: frozenset[str]) -> bool:
    """Membership that also honours prefix entries ending in '.'."""
    if category in groups:
        return True
    return any(g.endswith(".") and category.startswith(g) for g in groups)

PROFILES: dict[str, PolicyProfile] = {
    "strict": PolicyProfile(
        name="strict",
        label="엄격 (Strict)",
        sanitize_at=15,
        flag_at=30,
        block_at=50,
        always_block=_HARD_BLOCK,
        never_block=frozenset(),
        description="금융·의료 등 규제 환경. 의심스러우면 차단합니다.",
    ),
    "balanced": PolicyProfile(
        name="balanced",
        label="균형 (Balanced)",
        sanitize_at=20,
        flag_at=45,
        block_at=70,
        always_block=_HARD_BLOCK,
        never_block=_MASK_ONLY,
        description="일반 사내 AI 서비스 기본값. 마스킹으로 해결 가능한 건 통과시킵니다.",
    ),
    "permissive": PolicyProfile(
        name="permissive",
        label="완화 (Permissive)",
        sanitize_at=35,
        flag_at=65,
        block_at=88,
        always_block=frozenset({"harmful.csam", "harmful.self_harm"}),
        never_block=_MASK_ONLY | {"harmful.malware", "harmful.intrusion"},
        description="보안 연구·레드팀 환경. 방어 목적 요청의 오탐을 최소화합니다.",
    ),
}

DEFAULT_PROFILE = "balanced"


def compute_risk_score(findings: Sequence[Finding]) -> float:
    """Worst-finding floor plus decayed corroboration from the rest."""
    if not findings:
        return 0.0
    ranked = sorted((f.score for f in findings), reverse=True)
    score = ranked[0]
    for rank, value in enumerate(ranked[1:], start=1):
        score += value * (_CORROBORATION_DECAY**rank)
    return min(_MAX_SCORE, round(score, 2))


def decide_action(
    findings: Sequence[Finding], score: float, profile: PolicyProfile
) -> tuple[Action, str]:
    """Map findings + score onto an action, honouring category overrides."""
    categories = {f.category for f in findings}

    for category in categories:
        if _category_in(category, profile.always_block):
            return Action.BLOCK, f"'{category}'는 정책상 무조건 차단 대상입니다."

    if score >= profile.block_at:
        blocking = [
            f
            for f in findings
            if not _category_in(f.category, profile.never_block) and f.score >= 30
        ]
        if blocking:
            worst = max(blocking, key=lambda f: f.score)
            return Action.BLOCK, (
                f"위험도 {score:.0f}점이 차단 임계치({profile.block_at:.0f})를 초과했습니다. "
                f"주요 근거: {worst.message}"
            )
        # Everything above threshold is mask-only — sanitize instead of blocking.
        return Action.SANITIZE, (
            f"위험도 {score:.0f}점이지만 탐지 항목이 모두 마스킹 가능 유형이라 "
            "치환 후 전달합니다."
        )

    if score >= profile.flag_at:
        return Action.FLAG, (
            f"위험도 {score:.0f}점이 검토 임계치({profile.flag_at:.0f})를 넘어 "
            "전달하되 감사 로그에 표시합니다."
        )

    if score >= profile.sanitize_at or any(
        f.category.startswith(("pii.", "secret.")) for f in findings
    ):
        return Action.SANITIZE, "민감정보를 치환한 뒤 모델로 전달합니다."

    return Action.ALLOW, "위험 신호가 임계치 미만입니다. 그대로 전달합니다."


@dataclass
class StageOutcome:
    """One executed pipeline stage, as reported to the UI."""

    index: int
    detector: str
    title: str
    description: str
    stage: Stage
    findings: list[Finding]
    duration_ms: float
    action: Action
    text_changed: bool
    score: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "index": self.index,
            "detector": self.detector,
            "title": self.title,
            "description": self.description,
            "stage": self.stage.value,
            "findings": [f.to_dict() for f in self.findings],
            "duration_ms": round(self.duration_ms, 3),
            "action": self.action.value,
            "text_changed": self.text_changed,
            "score": round(self.score, 2),
        }


@dataclass
class PipelineResult:
    """Everything one pipeline (input or output) produced."""

    stage: Stage
    stages: list[StageOutcome] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)
    risk_score: float = 0.0
    action: Action = Action.ALLOW
    rationale: str = ""
    original_text: str = ""
    final_text: str = ""
    duration_ms: float = 0.0

    @property
    def blocked(self) -> bool:
        return self.action is Action.BLOCK

    @property
    def modified(self) -> bool:
        return self.final_text != self.original_text

    def to_dict(self) -> dict[str, Any]:
        return {
            "stage": self.stage.value,
            "stages": [s.to_dict() for s in self.stages],
            "findings": [f.to_dict() for f in self.findings],
            "risk_score": round(self.risk_score, 2),
            "action": self.action.value,
            "rationale": self.rationale,
            "original_text": self.original_text,
            "final_text": self.final_text,
            "modified": self.modified,
            "blocked": self.blocked,
            "duration_ms": round(self.duration_ms, 3),
        }


def build_input_detectors(
    *, use_presidio: bool = False, use_nemo: bool = False
) -> list[BaseDetector]:
    # Normalizer runs first so every later detector sees the decoded form.
    detectors: list[BaseDetector] = [
        Normalizer(),
        AnomalyDetector(),
        SecretsDetector(),
        PIIDetector(),
    ]

    # Optional Presidio NER-based PII runs alongside the native PII detector.
    if use_presidio:
        from .adapters import PresidioPIIDetector, presidio_available

        if presidio_available():
            detectors.append(PresidioPIIDetector())

    detectors.append(InjectionDetector())

    # Optional NeMo Guardrails input rails.
    if use_nemo:
        from .adapters import NeMoRailsDetector, nemo_available

        if nemo_available():
            detectors.append(NeMoRailsDetector())

    detectors.append(HarmfulContentDetector())
    return detectors


def build_output_detectors() -> list[BaseDetector]:
    return [
        CanaryLeakDetector(),
        SecretsLeakDetector(),
        PIILeakDetector(),
        ExfiltrationDetector(),
        HarmfulOutputDetector(),
        RefusalConsistencyDetector(),
    ]


class GuardrailEngine:
    """Runs the input and output pipelines and applies the active policy."""

    def __init__(
        self,
        profile: str | PolicyProfile = DEFAULT_PROFILE,
        *,
        use_presidio: bool = False,
        use_nemo: bool = False,
    ) -> None:
        self.profile = profile if isinstance(profile, PolicyProfile) else PROFILES[profile]
        self._input = build_input_detectors(use_presidio=use_presidio, use_nemo=use_nemo)
        self._output = build_output_detectors()

    # -- introspection used by the UI to draw the pipeline before running it --

    def describe(self) -> dict[str, Any]:
        def _describe(detectors: Iterable[BaseDetector]) -> list[dict[str, str]]:
            return [
                {
                    "name": d.name,
                    "title": d.title,
                    "description": d.description,
                    "stage": d.stage.value,
                }
                for d in detectors
            ]

        return {
            "profile": self.profile.to_dict(),
            "profiles": [p.to_dict() for p in PROFILES.values()],
            "input_stages": _describe(self._input),
            "output_stages": _describe(self._output),
        }

    @staticmethod
    def new_canary() -> str:
        return f"CANARY-{secrets.token_hex(8).upper()}"

    # -- pipelines --------------------------------------------------------

    async def run_pipeline(
        self,
        text: str,
        stage: Stage,
        context: dict[str, Any] | None = None,
        *,
        step_delay: float = 0.0,
        on_stage: Any = None,
    ) -> PipelineResult:
        """Execute one pipeline.

        `on_stage` is an optional awaitable called after each stage so the SSE
        endpoint can push progress; `step_delay` paces the demo animation
        without faking the measured per-stage timings.
        """
        detectors = self._input if stage is Stage.INPUT else self._output
        ctx: dict[str, Any] = dict(context or {})
        ctx.setdefault("normalized", text)

        result = PipelineResult(stage=stage, original_text=text, final_text=text)
        started = time.perf_counter()
        current = text

        for index, detector in enumerate(detectors):
            outcome_input = current
            det_result: DetectorResult = detector.run(outcome_input, ctx)

            if det_result.transformed_text is not None:
                current = det_result.transformed_text
            ctx.update(det_result.context)

            result.findings.extend(det_result.findings)
            running_score = compute_risk_score(result.findings)
            running_action, _ = decide_action(result.findings, running_score, self.profile)

            outcome = StageOutcome(
                index=index,
                detector=detector.name,
                title=detector.title,
                description=detector.description,
                stage=stage,
                findings=det_result.findings,
                duration_ms=det_result.duration_ms,
                action=running_action,
                text_changed=det_result.transformed_text is not None,
                score=running_score,
            )
            result.stages.append(outcome)

            if on_stage is not None:
                await on_stage(outcome, result)
            if step_delay:
                await asyncio.sleep(step_delay)

            # Fail fast: once the running verdict is BLOCK there is no reason to
            # keep inspecting, and stopping is what a real gateway would do.
            if running_action is Action.BLOCK:
                break

        result.risk_score = compute_risk_score(result.findings)
        result.action, result.rationale = decide_action(
            result.findings, result.risk_score, self.profile
        )
        result.final_text = current
        result.duration_ms = (time.perf_counter() - started) * 1000
        return result

    async def inspect_input(self, text: str, **kwargs: Any) -> PipelineResult:
        return await self.run_pipeline(text, Stage.INPUT, **kwargs)

    async def inspect_output(self, text: str, **kwargs: Any) -> PipelineResult:
        return await self.run_pipeline(text, Stage.OUTPUT, **kwargs)


def new_trace_id() -> str:
    return uuid.uuid4().hex[:16]
