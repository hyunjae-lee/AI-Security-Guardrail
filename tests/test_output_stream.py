"""스트리밍 출력 검사 — 사용자가 본 뒤에 탐지하면 늦는다."""
import pytest

from app.guardrail.engine import GuardrailEngine


async def feed(parts):
    for p in parts:
        yield p


async def collect(engine, parts, **kw):
    """중간에 끊을 때는 제너레이터를 닫아 준다 — 호출부도 이렇게 해야 한다."""
    out = []
    blocked = False
    gen = engine.inspect_output_stream(feed(parts), **kw)
    try:
        async for piece in gen:
            if piece is None:
                blocked = True
                break
            out.append(piece)
    finally:
        await gen.aclose()
    return "".join(out), blocked


@pytest.mark.asyncio
async def test_clean_answer_streams_through_unchanged():
    e = GuardrailEngine("balanced")
    parts = ["이번 학기 ", "장학금 지급 ", "절차를 안내합니다. " * 20]
    text, blocked = await collect(e, parts)
    assert not blocked
    assert text == "".join(parts)


@pytest.mark.asyncio
async def test_canary_is_caught_before_it_is_released():
    """카나리아가 꼬리 구간에서 완성되므로 화면에 나가기 전에 걸려야 한다."""
    e = GuardrailEngine("balanced")
    canary = "CANARY-0123456789ABCDEF"
    ctx = {"canary_token": canary}
    # 앞부분을 길게 흘린 뒤 마지막에 카나리아가 온다
    parts = ["안내 문구입니다. " * 40, canary]
    text, blocked = await collect(e, parts, context=ctx)
    assert blocked, "카나리아가 걸리지 않았습니다"
    assert canary not in text, "카나리아가 이미 사용자에게 나갔습니다"


@pytest.mark.asyncio
async def test_pattern_split_across_chunks_is_still_caught():
    """조각 경계에 걸친 토큰도 잡아야 한다 — 꼬리를 붙잡는 이유다."""
    e = GuardrailEngine("balanced")
    canary = "CANARY-FEDCBA9876543210"
    ctx = {"canary_token": canary}
    parts = ["설명입니다. " * 40, canary[:10], canary[10:]]
    text, blocked = await collect(e, parts, context=ctx)
    assert blocked
    assert canary not in text


@pytest.mark.asyncio
async def test_nothing_is_released_from_the_held_tail():
    """내보낸 양은 항상 '전체 - 꼬리' 이하여야 한다 (마지막 조각 전까지)."""
    e = GuardrailEngine("balanced")
    body = "안내 문구입니다. " * 30
    seen = []
    async for piece in e.inspect_output_stream(feed([body, "끝."]), hold=240):
        assert piece is not None
        seen.append(piece)
        # 마지막 flush 전에는 꼬리가 남아 있어야 한다
    assert "".join(seen) == body + "끝."


@pytest.mark.asyncio
async def test_empty_stream_is_safe():
    e = GuardrailEngine("balanced")
    text, blocked = await collect(e, [])
    assert text == "" and not blocked
