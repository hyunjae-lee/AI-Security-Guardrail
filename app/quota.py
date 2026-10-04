"""요청 쿼터와 레이트 리밋.

왜 필요한가
----------
`docs/deployment-sizing.md` 에서 계산했듯 **가드레일 인프라는 월 56만 원인데
LLM API 는 월 280만~6,500만 원**이다.  통제해야 할 비용은 우리 쪽이 아니라
저쪽이고, 쿼터가 없으면 한 사람의 스크립트가 한 달 예산을 태울 수 있다.

막는 방식
--------
토큰 버킷을 **이용자별**로 둔다.  창을 잘라 세는 방식(고정 윈도우)은 경계에서
두 배가 통과하는 문제가 있고, 교내 사용은 수업 시작 직후처럼 몰리는 성격이라
짧은 폭주를 허용하되 평균을 묶는 토큰 버킷이 맞다.

하루 한도는 별도로 센다.  분당 한도만 두면 하루 종일 천천히 태우는 것을 못 막는다.

메모리에만 둔다 — 노드가 둘이면 각자 세므로 실효 한도가 2배가 된다.
그 정도 오차는 받아들이고, 정확한 공유 카운터가 필요해지면 Redis 로 옮긴다.
지금 Redis 를 들이면 운영 부품이 하나 더 늘고 그만한 값을 못 한다.
"""

from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass, field

#: 분당 허용 요청. 0 이면 끈다.
RATE_PER_MIN = int(os.environ.get("GUARDRAIL_RATE_PER_MIN", "20"))
#: 짧은 폭주 허용량 (버킷 용량). 수업 시작 직후처럼 몰리는 것을 받아 준다.
BURST = int(os.environ.get("GUARDRAIL_RATE_BURST", "10"))
#: 하루 허용 요청. 0 이면 끈다.
DAILY_LIMIT = int(os.environ.get("GUARDRAIL_DAILY_LIMIT", "500"))


@dataclass
class _Bucket:
    tokens: float
    last: float
    day: int = 0
    day_count: int = 0


@dataclass
class QuotaResult:
    allowed: bool
    reason: str = ""
    retry_after: int = 0
    remaining_today: int = 0


@dataclass
class QuotaKeeper:
    """이용자별 토큰 버킷 + 일일 카운터."""

    rate_per_min: int = RATE_PER_MIN
    burst: int = BURST
    daily_limit: int = DAILY_LIMIT
    _buckets: dict[str, _Bucket] = field(default_factory=dict)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def check(self, user: str, now: float | None = None) -> QuotaResult:
        if self.rate_per_min <= 0 and self.daily_limit <= 0:
            return QuotaResult(True)

        now = time.time() if now is None else now
        day = int(now // 86400)

        with self._lock:
            b = self._buckets.get(user)
            if b is None:
                b = self._buckets[user] = _Bucket(tokens=float(self.burst), last=now, day=day)
            if b.day != day:  # 날이 바뀌면 일일 카운터만 초기화한다
                b.day, b.day_count = day, 0

            if self.daily_limit > 0 and b.day_count >= self.daily_limit:
                # 자정까지 남은 초. 하루 한도는 기다린다고 풀리지 않는다.
                return QuotaResult(
                    False,
                    f"하루 한도 {self.daily_limit}건을 모두 썼습니다.",
                    retry_after=int((day + 1) * 86400 - now),
                )

            if self.rate_per_min > 0:
                b.tokens = min(
                    float(self.burst),
                    b.tokens + (now - b.last) * self.rate_per_min / 60.0,
                )
                b.last = now
                if b.tokens < 1.0:
                    wait = (1.0 - b.tokens) * 60.0 / self.rate_per_min
                    return QuotaResult(
                        False,
                        f"분당 {self.rate_per_min}건 한도를 넘었습니다.",
                        retry_after=max(1, int(wait) + 1),
                    )
                b.tokens -= 1.0

            b.day_count += 1
            left = self.daily_limit - b.day_count if self.daily_limit > 0 else -1
            return QuotaResult(True, remaining_today=left)

    def snapshot(self) -> dict[str, int]:
        """운영 화면용 — 지금 몇 명이 얼마나 썼나."""
        with self._lock:
            return {u: b.day_count for u, b in self._buckets.items()}
