"""쿼터 동작 — 비용 통제의 마지막 방어선이라 경계를 눈으로 확인한다."""
from app.quota import QuotaKeeper


def test_burst_allows_then_throttles():
    """버킷 용량만큼은 즉시 통과하고, 그 뒤엔 막힌다."""
    q = QuotaKeeper(rate_per_min=60, burst=5, daily_limit=0)
    now = 1_000_000.0
    assert all(q.check("u", now).allowed for _ in range(5))
    blocked = q.check("u", now)
    assert not blocked.allowed
    assert blocked.retry_after >= 1


def test_tokens_refill_over_time():
    q = QuotaKeeper(rate_per_min=60, burst=2, daily_limit=0)
    now = 1_000_000.0
    q.check("u", now)
    q.check("u", now)
    assert not q.check("u", now).allowed
    # 분당 60건이면 1초에 1개가 찬다
    assert q.check("u", now + 1.1).allowed


def test_daily_limit_is_separate_from_rate():
    """분당 한도만 두면 하루 종일 천천히 태우는 것을 못 막는다."""
    q = QuotaKeeper(rate_per_min=0, burst=0, daily_limit=3)
    now = 1_000_000.0
    assert sum(q.check("u", now + i * 600).allowed for i in range(5)) == 3


def test_daily_counter_resets_next_day():
    q = QuotaKeeper(rate_per_min=0, burst=0, daily_limit=2)
    now = 1_000_000.0
    q.check("u", now)
    q.check("u", now)
    assert not q.check("u", now).allowed
    assert q.check("u", now + 86_400).allowed


def test_users_are_independent():
    q = QuotaKeeper(rate_per_min=0, burst=0, daily_limit=1)
    now = 1_000_000.0
    assert q.check("a", now).allowed
    assert q.check("b", now).allowed
    assert not q.check("a", now).allowed


def test_disabled_when_both_limits_zero():
    q = QuotaKeeper(rate_per_min=0, burst=0, daily_limit=0)
    now = 1_000_000.0
    assert all(q.check("u", now).allowed for _ in range(100))
