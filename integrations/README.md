# 외부 연동

## LiteLLM 프록시 (`litellm/`)

교내 앱이 **코드를 고치지 않고** 검사대를 지나게 한다. `base_url` 만 바꾸면 된다.

```
앱 ──(OpenAI SDK)──▶ LiteLLM 프록시 ──▶ [커스텀 가드레일] ──▶ 외부 모델
                                          └─ HTTP ─▶ /api/inspect
```

**HTTP 로 부르는 이유**: LiteLLM 은 최신 pydantic 을 요구하는데 이 저장소는
`pydantic==2.10.4` 에 고정돼 있다. 같은 프로세스에 넣으면 충돌한다(확인함).
HTTP 로 분리하면 두 서비스의 의존성이 완전히 독립하고, 배포도 컨테이너 둘로
자연스럽게 나뉜다. 가드레일을 고쳐도 프록시를 다시 배포할 필요가 없다.

```bash
pip install 'litellm[proxy]' httpx
export GUARDRAIL_URL=http://127.0.0.1:8088
litellm --config integrations/litellm/config.yaml
```

**게이트웨이가 죽으면 기본값은 차단(fail-closed)이다.** 검사 없이 질의가 국경을
넘는 것이 이 프로젝트가 막으려는 바로 그 상황이라, 조용히 통과시킬 수 없다.
연구·실험용으로 열어야 하면 `GUARDRAIL_FAIL_OPEN=1`.

| 우리 판정 | 프록시 동작 |
|---|---|
| ALLOW | 통과 |
| SANITIZE | **치환된 본문으로** 모델에 전달 |
| FLAG | 통과 + 메타데이터 표시 |
| BLOCK | HTTP 400 거부 |
