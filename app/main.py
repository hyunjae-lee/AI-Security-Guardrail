"""FastAPI application: the guardrail gateway plus the comparison demo.

The interesting endpoint is `POST /api/stream`, which runs both lanes —
unguarded and guarded — concurrently and pushes SSE events as each pipeline
stage finishes.  The UI animation is therefore driven by real backend timings
rather than a scripted client-side animation.
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .audit import AuditLog
from .config import SYSTEM_PROMPT_TEMPLATE, settings
from .guardrail import (
    PROFILES,
    Action,
    GuardrailEngine,
    PipelineResult,
    Stage,
    new_trace_id,
)
from .llm import available_backends, get_backend
from .models import AnalyzeRequest, InspectRequest

logger = logging.getLogger("guardrail")

audit = AuditLog(settings.db_path, enabled=settings.audit_enabled)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info("guardrail starting on %s:%s", settings.host, settings.port)
    yield
    audit.close()


app = FastAPI(
    title="AI Security Guardrail",
    version="1.0.0",
    description="프롬프트가 가드레일 없이 / 가드레일을 통과해 AI 시스템에 도달하는 과정을 시각화하는 PoC",
    lifespan=lifespan,
)


def _engine(profile: str) -> GuardrailEngine:
    if profile not in PROFILES:
        raise HTTPException(status_code=400, detail=f"알 수 없는 정책 프로파일: {profile}")
    return GuardrailEngine(
        profile, use_presidio=settings.use_presidio, use_nemo=settings.use_nemo
    )


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _categories(results: list[PipelineResult]) -> list[str]:
    seen: list[str] = []
    for result in results:
        for finding in result.findings:
            if finding.category not in seen:
                seen.append(finding.category)
    return seen


# --------------------------------------------------------------------------
# Core orchestration
# --------------------------------------------------------------------------


async def _run_unguarded(
    prompt: str, system: str, backend_id: str, canary: str, profile: str, emit: Any
) -> dict[str, Any]:
    """The status quo: the prompt goes straight to the model, verbatim.

    Output detectors still run here — but only to *label* what got through.
    Nothing is blocked, which is the whole point of the comparison.
    """
    await emit("unguarded_start", {"prompt": prompt})

    llm = get_backend(backend_id)
    response = await llm.complete(prompt, system)
    await emit(
        "unguarded_model",
        {"response": response.to_dict(), "system_prompt_sent": system},
    )

    engine = GuardrailEngine(profile)
    observed = await engine.inspect_output(
        response.text,
        context={"canary_token": canary, "input_risk_score": 0.0, "allowed_domains": []},
    )

    leaked = [f for f in observed.findings if f.severity.weight >= 65]
    await emit(
        "unguarded_done",
        {
            "response": response.to_dict(),
            "observed": observed.to_dict(),
            "leak_count": len(leaked),
            "leaked": [f.to_dict() for f in leaked],
        },
    )
    return {
        "response": response.to_dict(),
        "observed": observed.to_dict(),
        "leak_count": len(leaked),
    }


async def _run_guarded(
    prompt: str,
    system: str,
    backend_id: str,
    canary: str,
    profile: str,
    emit: Any,
    step_delay: float,
) -> dict[str, Any]:
    """The protected path: input pipeline → model → output pipeline."""
    engine = _engine(profile)
    await emit("guarded_start", {"prompt": prompt, "profile": engine.profile.to_dict()})

    async def on_input_stage(outcome, running):  # type: ignore[no-untyped-def]
        await emit("stage", {"lane": "guarded", "phase": "input", **outcome.to_dict()})

    input_result = await engine.inspect_input(
        prompt,
        context={"canary_token": canary},
        step_delay=step_delay,
        on_stage=on_input_stage,
    )
    await emit("input_verdict", {"result": input_result.to_dict()})

    if input_result.blocked:
        blocked_payload = {
            "blocked_at": "input",
            "input": input_result.to_dict(),
            "output": None,
            "response": None,
            "original_prompt": prompt,
            "forwarded_prompt": None,  # never reached the model
            "raw_response": None,
            "delivered_text": None,
            "input_modified": input_result.modified,
            "output_modified": False,
            "final_action": Action.BLOCK.value,
        }
        await emit("guarded_done", blocked_payload)
        return blocked_payload

    # The model receives the sanitized prompt, never the raw one.
    forwarded = input_result.final_text
    await emit("guarded_model_start", {"forwarded_prompt": forwarded})

    llm = get_backend(backend_id)
    response = await llm.complete(forwarded, system)
    await emit("guarded_model", {"response": response.to_dict()})

    async def on_output_stage(outcome, running):  # type: ignore[no-untyped-def]
        await emit("stage", {"lane": "guarded", "phase": "output", **outcome.to_dict()})

    output_result = await engine.inspect_output(
        response.text,
        context={
            "canary_token": canary,
            "input_risk_score": input_result.risk_score,
            "allowed_domains": [],
        },
        step_delay=step_delay,
        on_stage=on_output_stage,
    )

    if output_result.blocked:
        delivered = (
            "요청을 처리했지만 응답에서 정책 위반이 감지되어 전달이 차단되었습니다. "
            "보안팀에 감사 로그가 기록되었습니다."
        )
        final_action = Action.BLOCK.value
    else:
        delivered = output_result.final_text
        final_action = max(
            input_result.action, output_result.action, key=lambda a: a.rank
        ).value

    payload = {
        "blocked_at": "output" if output_result.blocked else None,
        "input": input_result.to_dict(),
        "output": output_result.to_dict(),
        "response": response.to_dict(),
        # The three texts the diff view compares: what the user typed, what the
        # model actually received (sanitized), the model's raw answer, and what
        # the user finally gets (masked or blocked).
        "original_prompt": prompt,
        "forwarded_prompt": forwarded,
        "raw_response": response.text,
        "delivered_text": delivered,
        "input_modified": input_result.modified,
        "output_modified": output_result.blocked or output_result.modified,
        "final_action": final_action,
    }
    await emit("guarded_done", payload)
    return payload


async def _orchestrate(req: AnalyzeRequest) -> AsyncIterator[str]:
    """Run both lanes concurrently, multiplexing their events onto one stream."""
    trace_id = new_trace_id()
    engine = _engine(req.profile)
    canary = GuardrailEngine.new_canary()
    system = SYSTEM_PROMPT_TEMPLATE.format(canary=canary)
    step_delay = settings.stage_delay_s if req.animate else 0.0

    queue: asyncio.Queue[tuple[str, dict[str, Any]] | None] = asyncio.Queue()

    async def emit(event: str, data: dict[str, Any]) -> None:
        await queue.put((event, data))

    yield _sse(
        "meta",
        {
            "trace_id": trace_id,
            "canary": canary,
            "system_prompt": system,
            "compare": req.compare,
            "backend": req.backend,
            **engine.describe(),
        },
    )

    results: dict[str, Any] = {}

    async def unguarded_task() -> None:
        if not req.compare:
            return
        results["unguarded"] = await _run_unguarded(
            req.prompt, system, req.backend, canary, req.profile, emit
        )

    async def guarded_task() -> None:
        results["guarded"] = await _run_guarded(
            req.prompt, system, req.backend, canary, req.profile, emit, step_delay
        )

    async def runner() -> None:
        try:
            await asyncio.gather(unguarded_task(), guarded_task())
        except Exception as exc:  # noqa: BLE001 - reported to the client
            logger.exception("pipeline failed")
            await queue.put(("error", {"message": f"{type(exc).__name__}: {exc}"}))
        finally:
            await queue.put(None)

    task = asyncio.create_task(runner())
    try:
        while True:
            item = await queue.get()
            if item is None:
                break
            event, data = item
            yield _sse(event, data)
    finally:
        await task

    guarded = results.get("guarded", {})
    unguarded = results.get("unguarded")
    summary = _summarize(trace_id, req, guarded, unguarded)
    _record(trace_id, req, guarded, unguarded, summary)
    yield _sse("summary", summary)
    yield _sse("done", {"trace_id": trace_id})


def _summarize(
    trace_id: str,
    req: AnalyzeRequest,
    guarded: dict[str, Any],
    unguarded: dict[str, Any] | None,
) -> dict[str, Any]:
    input_res = guarded.get("input") or {}
    output_res = guarded.get("output") or {}
    all_findings = list(input_res.get("findings", [])) + list(output_res.get("findings", []))
    categories = list(dict.fromkeys(f["category"] for f in all_findings))

    total_ms = float(input_res.get("duration_ms", 0.0)) + float(
        output_res.get("duration_ms", 0.0)
    )

    return {
        "trace_id": trace_id,
        "profile": req.profile,
        "backend": req.backend,
        "final_action": guarded.get("final_action", Action.ALLOW.value),
        "blocked_at": guarded.get("blocked_at"),
        "input_score": input_res.get("risk_score", 0.0),
        "output_score": output_res.get("risk_score", 0.0),
        "finding_count": len(all_findings),
        "categories": categories,
        "guardrail_overhead_ms": round(total_ms, 2),
        "unguarded_leak_count": (unguarded or {}).get("leak_count", 0),
        "prevented": bool(
            unguarded
            and unguarded.get("leak_count", 0) > 0
            and guarded.get("final_action") in {Action.BLOCK.value, Action.SANITIZE.value}
        ),
    }


def _record(
    trace_id: str,
    req: AnalyzeRequest,
    guarded: dict[str, Any],
    unguarded: dict[str, Any] | None,
    summary: dict[str, Any],
) -> None:
    input_res = guarded.get("input") or {}
    output_res = guarded.get("output") or {}
    try:
        audit.record(
            {
                "trace_id": trace_id,
                "profile": req.profile,
                "backend": req.backend,
                "prompt": req.prompt,
                "input_action": input_res.get("action", Action.ALLOW.value),
                "input_score": input_res.get("risk_score", 0.0),
                "output_action": output_res.get("action"),
                "output_score": output_res.get("risk_score"),
                "final_action": summary["final_action"],
                "unguarded_leak": bool((unguarded or {}).get("leak_count", 0)),
                "categories": summary["categories"],
                "findings": list(input_res.get("findings", []))
                + list(output_res.get("findings", [])),
                "total_ms": summary["guardrail_overhead_ms"],
            }
        )
    except Exception:  # noqa: BLE001 - auditing must never break the request
        logger.exception("audit write failed for %s", trace_id)


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    return {"status": "ok", "profiles": list(PROFILES), "audit": audit.enabled}


@app.get("/api/config")
async def get_config() -> dict[str, Any]:
    engine = _engine(settings.default_profile)
    return {
        **engine.describe(),
        "backends": available_backends(),
        "integrations": {
            "presidio": settings.use_presidio,
            "nemo": settings.use_nemo,
        },
        "defaults": {
            "profile": settings.default_profile,
            "backend": settings.default_backend,
        },
    }


@app.get("/api/samples")
async def get_samples() -> dict[str, Any]:
    path = settings.samples_path
    if not path.exists():
        return {"samples": []}
    return json.loads(path.read_text(encoding="utf-8"))


@app.post("/api/stream")
async def stream(req: AnalyzeRequest) -> StreamingResponse:
    _engine(req.profile)  # validate the profile before opening the stream
    return StreamingResponse(
        _orchestrate(req),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest) -> dict[str, Any]:
    """Non-streaming equivalent of /api/stream, for scripting and tests."""
    req = req.model_copy(update={"animate": False})
    events: list[dict[str, Any]] = []
    summary: dict[str, Any] = {}
    payload: dict[str, Any] = {}

    async for chunk in _orchestrate(req):
        head, _, body = chunk.partition("\n")
        event = head.removeprefix("event: ").strip()
        data = json.loads(body.removeprefix("data: ").strip())
        if event == "summary":
            summary = data
        elif event in {"guarded_done", "unguarded_done", "meta"}:
            payload[event] = data
        events.append({"event": event, "data": data})

    return {
        "summary": summary,
        "meta": payload.get("meta", {}),
        "guarded": payload.get("guarded_done", {}),
        "unguarded": payload.get("unguarded_done"),
        "event_count": len(events),
    }


@app.post("/api/inspect")
async def inspect(req: InspectRequest) -> dict[str, Any]:
    """Guardrail-only check with no model call — the embeddable gateway API."""
    engine = _engine(req.profile)
    stage = Stage.INPUT if req.stage == "input" else Stage.OUTPUT
    result = await engine.run_pipeline(req.text, stage, context={"canary_token": None})
    return result.to_dict()


@app.get("/api/audit")
async def get_audit(limit: int = 50) -> dict[str, Any]:
    return {"entries": audit.recent(min(max(limit, 1), 200))}


@app.get("/api/stats")
async def get_stats() -> dict[str, Any]:
    return audit.stats()


if settings.static_dir.exists():
    app.mount("/static", StaticFiles(directory=settings.static_dir), name="static")

    @app.get("/")
    async def index() -> FileResponse:
        return FileResponse(settings.static_dir / "index.html")
