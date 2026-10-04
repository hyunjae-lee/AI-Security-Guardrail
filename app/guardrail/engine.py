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
from .base import Action, BaseDetector, DetectorResult, Finding, Severity, Stage
from .classify import DataClassifier
from .harmful import HarmfulContentDetector, HarmfulOutputDetector
from .injection import InjectionDetector
from .normalizer import Normalizer
from .output import CanaryLeakDetector, ExfiltrationDetector, RefusalConsistencyDetector
from .pii import PIIDetector, PIILeakDetector
from .rag import RAGAccessControl
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


def compute_risk_score(findings: Sequence[Finding], mode: str = "worst_decay") -> float:
    """Turn findings into a single 0-100 risk score.

    Two modes:
      * "worst_decay" (default) — the worst finding sets the floor and each
        additional finding adds a sharply discounted amount.  Answers "how bad
        is the worst thing, and is there corroboration?" without letting five
        LOWs outweigh one CRITICAL.
      * "sum" — plain additive scoring capped at 100, matching the midterm
        framework's 합산 점수 model (rule scores added together).
    """
    if not findings:
        return 0.0
    if mode == "sum":
        return min(_MAX_SCORE, round(sum(f.score for f in findings), 2))
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
    # Public pipeline context (RAG retrieval, data grade) for the caller/UI.
    context: dict[str, Any] = field(default_factory=dict)

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
            "data_grade": self.context.get("data_grade"),
            "data_grade_label": self.context.get("data_grade_label"),
            "data_grade_allowance": self.context.get("data_grade_allowance"),
            "rag_permitted": self.context.get("rag_permitted", []),
            "rag_denied": self.context.get("rag_denied", []),
        }


def build_input_detectors(
    *, use_presidio: bool = False, use_nemo: bool = False, use_pi_model: bool = False
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

    # 규칙 탐지기 바로 뒤에 ML 분류기를 둔다 — 대체가 아니라 보강이다.
    # 켜기 전에 반드시 scripts/eval.py 로 켠/끈 값을 비교할 것.
    if use_pi_model:
        from .adapters import TransformerInjectionDetector, pi_model_available

        if pi_model_available():
            detectors.append(TransformerInjectionDetector())

    # Optional NeMo Guardrails input rails.
    if use_nemo:
        from .adapters import NeMoRailsDetector, nemo_available

        if nemo_available():
            detectors.append(NeMoRailsDetector())

    detectors.append(HarmfulContentDetector())
    # RAG retrieval-stage access control, then the 5-grade data classifier
    # (runs last so it can aggregate everything the earlier stages found).
    detectors.append(RAGAccessControl())
    detectors.append(DataClassifier())
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
        use_pi_model: bool = False,
        scoring: str = "worst_decay",
        clearance: str = "student",
    ) -> None:
        self.profile = profile if isinstance(profile, PolicyProfile) else PROFILES[profile]
        self.scoring = scoring if scoring in {"worst_decay", "sum"} else "worst_decay"
        self.clearance = clearance
        self._input = build_input_detectors(
            use_presidio=use_presidio, use_nemo=use_nemo, use_pi_model=use_pi_model
        )
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
        ctx.setdefault("clearance", self.clearance)

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
            # Expose accumulated findings so late stages (data classifier) can
            # aggregate what earlier detectors found, with their severities.
            ctx["_finding_pairs"] = [
                (f.category, f.severity.weight) for f in result.findings
            ]
            ctx["_critical_pii"] = [
                f.category
                for f in result.findings
                if f.category.startswith("pii.") and f.severity is Severity.CRITICAL
            ]
            running_score = compute_risk_score(result.findings, self.scoring)
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

        result.risk_score = compute_risk_score(result.findings, self.scoring)
        result.action, result.rationale = decide_action(
            result.findings, result.risk_score, self.profile
        )
        result.final_text = current
        # If the pipeline short-circuited on BLOCK before the data classifier ran,
        # still assign a data grade from what was found so the UI is complete.
        if stage is Stage.INPUT and "data_grade" not in ctx:
            from .classify import GRADES, classify_grade

            pairs = [(f.category, f.severity.weight) for f in result.findings]
            crit = {
                f.category
                for f in result.findings
                if f.category.startswith("pii.") and f.severity is Severity.CRITICAL
            }
            g = classify_grade(pairs, ctx)
            if crit & {"pii.rrn", "pii.credit_card"}:
                g = max(g, 5)
            ctx["data_grade"] = g
            ctx["data_grade_label"] = GRADES[g].label
            ctx["data_grade_allowance"] = GRADES[g].allowance
        result.context = {k: v for k, v in ctx.items() if not k.startswith("_")}
        result.duration_ms = (time.perf_counter() - started) * 1000
        return result

    async def inspect_input(self, text: str, **kwargs: Any) -> PipelineResult:
        return await self.run_pipeline(text, Stage.INPUT, **kwargs)

    async def inspect_output(self, text: str, **kwargs: Any) -> PipelineResult:
        return await self.run_pipeline(text, Stage.OUTPUT, **kwargs)

    async def inspect_output_stream(
        self,
        chunks: Any,
        context: dict[str, Any] | None = None,
        *,
        hold: int = 240,
    ) -> Any:
        """스트리밍 응답을 흘려보내면서 검사한다.

        왜 필요한가
        ----------
        토큰을 받는 족족 사용자에게 보내면, 카나리아 토큰이 **화면에 뜬 뒤에**
        탐지하게 된다.  시스템 프롬프트 유출은 한 조각만 새도 유출이라 그때는
        이미 늦었다.  그렇다고 응답 전체를 받고 검사하면 스트리밍의 이유
        (체감 속도)가 사라진다.

        그래서 **꼬리를 붙잡는다.**  버퍼 끝에서 `hold` 글자는 내보내지 않고,
        그보다 앞선 부분만 흘려보낸다.  탐지 패턴이 조각 경계에 걸쳐 있어도
        아직 붙잡고 있는 구간 안에서 완성되므로 놓치지 않는다.

        매번 **버퍼 전체를 다시 검사**한다.  앞서 내보낸 구간까지 포함해 다시
        보는 이유는, 새로 온 글자가 이미 보낸 글자와 합쳐져 패턴을 완성할 수
        있기 때문이다.  답변 길이에서 O(n²) 이지만 2,000자 기준 수십 ms 라
        정확성을 택했다.

        차단이 나면 `None` 을 내보내고 끝낸다 — 호출부는 그 신호를 받아
        이미 보낸 내용을 지우고 차단 안내로 바꾼다.

        사용:
            async for piece in engine.inspect_output_stream(token_stream()):
                if piece is None:
                    ...  # 차단
                    break
                send_to_browser(piece)
        """
        buf = ""
        released = 0
        last: PipelineResult | None = None

        async for chunk in chunks:
            if not chunk:
                continue
            buf += chunk
            last = await self.inspect_output(buf, context=context, step_delay=0)
            if last.blocked:
                yield None
                return
            safe = max(released, len(last.final_text) - hold)
            if safe > released:
                yield last.final_text[released:safe]
                released = safe

        # 마지막 조각까지 검사한 뒤 남은 꼬리를 내보낸다.
        if last is None:
            return
        if last.blocked:
            yield None
            return
        if released < len(last.final_text):
            yield last.final_text[released:]


def new_trace_id() -> str:
    return uuid.uuid4().hex[:16]
