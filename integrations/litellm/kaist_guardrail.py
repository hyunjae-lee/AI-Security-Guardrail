"""LiteLLM 커스텀 가드레일 — 교내 앱이 코드를 고치지 않고 검사대를 지나게 한다.

왜 이 파일이 필요한가
--------------------
`/api/inspect` 는 우리만 아는 전용 규격이다.  전용 API 를 쓰라고 하면 아무도
쓰지 않는다.  LiteLLM(60k★)은 사실상 표준인 OpenAI 호환 게이트웨이라, 교내 앱이
**base_url 만 바꾸면** 그대로 검사대를 지난다.  애플리케이션 코드 수정은 0 이다.

    앱 ──(OpenAI SDK)──▶ LiteLLM 프록시 ──▶ [이 가드레일] ──▶ 외부 모델
                                              │
                                              └─ HTTP ─▶ 우리 게이트웨이 /api/inspect

왜 HTTP 로 부르는가 (in-process 가 아니라)
-----------------------------------------
LiteLLM 은 최신 pydantic 을 요구하고 이 저장소는 pydantic 2.10.4 에 고정돼 있다.
같은 프로세스에 넣으면 의존성이 충돌한다(실제로 확인했다).  HTTP 로 부르면
**두 서비스의 의존성이 완전히 분리**되고, 배포도 컨테이너 둘로 자연스럽게 나뉜다.
가드레일 엔진을 고쳐도 프록시를 다시 배포할 필요가 없다.

설치·실행
--------
    pip install litellm[proxy] httpx
    export GUARDRAIL_URL=http://127.0.0.1:8088   # 우리 게이트웨이
    litellm --config integrations/litellm/config.yaml

    # 앱 쪽은 이것만 바꾸면 끝
    client = OpenAI(base_url="http://litellm:4000", api_key="...")

판정 매핑
--------
| 우리 판정  | LiteLLM 동작                                   |
|-----------|-----------------------------------------------|
| ALLOW     | 그대로 통과                                     |
| SANITIZE  | **치환된 본문으로 바꿔서** 모델에 전달 (가방째 압수하지 않는다) |
| FLAG      | 통과시키되 메타데이터에 표시 (감사에서 보인다)        |
| BLOCK     | HTTPException 으로 거부                          |

게이트웨이가 죽어 있으면 어떻게 하나
---------------------------------
`GUARDRAIL_FAIL_OPEN` 으로 정한다.  기본값은 **fail-closed(차단)** 다.
검사대가 없는 상태로 질의가 국경을 넘는 것이 이 프로젝트가 막으려는 바로 그 상황이라,
조용히 통과시키는 쪽을 기본값으로 둘 수 없다.
"""

from __future__ import annotations

import os
from typing import Any, Literal

import httpx
from fastapi import HTTPException
from litellm.integrations.custom_guardrail import CustomGuardrail

GUARDRAIL_URL = os.environ.get("GUARDRAIL_URL", "http://127.0.0.1:8088").rstrip("/")
PROFILE = os.environ.get("GUARDRAIL_PROFILE", "balanced")
TIMEOUT = float(os.environ.get("GUARDRAIL_TIMEOUT", "5"))
FAIL_OPEN = os.environ.get("GUARDRAIL_FAIL_OPEN", "0").strip().lower() in {"1", "true", "yes"}
#: 스트리밍 중 몇 글자마다 다시 검사할지. 짧을수록 안전하고 느리다.
#: 이미 보낸 조각은 되돌릴 수 없으므로 기본값을 작게 둔다.
STREAM_CHECK_EVERY = int(os.environ.get("GUARDRAIL_STREAM_CHECK_EVERY", "120"))


class KaistGuardrail(CustomGuardrail):
    """교내 가드레일 게이트웨이를 LiteLLM 프록시에 끼운다."""

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self._client = httpx.AsyncClient(timeout=TIMEOUT)

    async def _inspect(self, text: str, stage: Literal["input", "output"]) -> dict[str, Any] | None:
        """게이트웨이에 한 번 물어본다. 실패하면 None (정책은 호출부가 정한다)."""
        try:
            r = await self._client.post(
                f"{GUARDRAIL_URL}/api/inspect",
                json={"text": text, "profile": PROFILE, "stage": stage},
            )
            r.raise_for_status()
            return r.json()
        except Exception:  # noqa: BLE001 — 어떤 실패든 정책 판단으로 넘긴다
            return None

    @staticmethod
    def _unreachable() -> None:
        if FAIL_OPEN:
            return
        raise HTTPException(
            status_code=503,
            detail={
                "error": "guardrail_unavailable",
                "message": "가드레일 게이트웨이에 연결할 수 없어 요청을 차단했습니다. "
                "검사 없이 외부 모델로 보내지 않습니다.",
            },
        )

    @staticmethod
    def _categories(result: dict[str, Any]) -> list[str]:
        return sorted({f["category"] for f in result.get("findings", [])})

    # ── 나가는 질의 ──────────────────────────────────────────
    async def async_pre_call_hook(
        self,
        user_api_key_dict: Any,
        cache: Any,
        data: dict[str, Any],
        call_type: str,
    ) -> dict[str, Any] | None:
        messages = data.get("messages") or []
        if not messages:
            return data

        # 마지막 사용자 발화만 검사한다. 앞선 대화는 이미 한 번 지나왔다.
        idx = next(
            (i for i in range(len(messages) - 1, -1, -1) if messages[i].get("role") == "user"),
            None,
        )
        if idx is None:
            return data
        content = messages[idx].get("content")
        if not isinstance(content, str) or not content.strip():
            return data

        result = await self._inspect(content, "input")
        if result is None:
            self._unreachable()
            return data

        action = result.get("action")
        if action == "block":
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "blocked_by_guardrail",
                    "message": result.get("rationale", "정책상 차단된 요청입니다."),
                    "categories": self._categories(result),
                    "risk_score": result.get("risk_score"),
                },
            )

        if action == "sanitize" and result.get("modified"):
            # 가방째 압수하지 않는다 — 금지 물건만 빼고 보낸다.
            messages[idx]["content"] = result["final_text"]

        if action in ("flag", "sanitize"):
            meta = data.setdefault("metadata", {})
            meta["kaist_guardrail"] = {
                "action": action,
                "risk_score": result.get("risk_score"),
                "categories": self._categories(result),
                "data_grade": result.get("data_grade"),
            }
        return data

    # ── 돌아온 답변 (스트리밍) ──────────────────────────────
    async def async_post_call_streaming_iterator_hook(
        self,
        user_api_key_dict: Any,
        response: Any,
        request_data: dict[str, Any],
    ) -> Any:
        """토큰이 흐르는 동안 검사한다.

        그냥 흘려보내면 카나리아 토큰이 **화면에 뜬 뒤에** 걸린다. 시스템
        프롬프트 유출은 한 조각만 새도 유출이라 그때는 이미 늦었다.
        그래서 게이트웨이의 `/api/inspect` 를 쓰지 않고 **누적 버퍼를 보내**
        판정을 받는다 — 꼬리를 붙잡는 논리는 서버 쪽 엔진에 있다
        (`GuardrailEngine.inspect_output_stream`).

        여기서는 보수적으로 간다: 일정 길이마다 지금까지 받은 전체를 검사하고,
        차단이 나오면 그 자리에서 스트림을 끊는다. 이미 보낸 조각은 되돌릴 수
        없으므로 **검사 주기를 짧게** 둔다.
        """
        buf = ""
        checked = 0
        async for part in response:
            try:
                delta = part.choices[0].delta.content or ""
            except Exception:  # noqa: BLE001 — 도구 호출 등 본문이 없는 조각
                delta = ""
            buf += delta
            if len(buf) - checked >= STREAM_CHECK_EVERY:
                result = await self._inspect(buf, "output")
                checked = len(buf)
                if result is None:
                    self._unreachable()
                elif result.get("action") == "block":
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "error": "response_blocked_by_guardrail",
                            "message": result.get("rationale", "응답이 정책상 차단되었습니다."),
                            "categories": self._categories(result),
                        },
                    )
            yield part

    # ── 돌아온 답변 (한 번에) ────────────────────────────────
    async def async_post_call_success_hook(
        self,
        data: dict[str, Any],
        user_api_key_dict: Any,
        response: Any,
    ) -> Any:
        """나갈 때 깨끗했어도 돌아올 때 깨끗하다는 보장은 없다."""
        choices = getattr(response, "choices", None) or []
        for choice in choices:
            msg = getattr(choice, "message", None)
            content = getattr(msg, "content", None)
            if not isinstance(content, str) or not content.strip():
                continue

            result = await self._inspect(content, "output")
            if result is None:
                self._unreachable()
                continue

            if result.get("action") == "block":
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "response_blocked_by_guardrail",
                        "message": result.get("rationale", "응답이 정책상 차단되었습니다."),
                        "categories": self._categories(result),
                    },
                )
            if result.get("modified"):
                msg.content = result["final_text"]
        return response
