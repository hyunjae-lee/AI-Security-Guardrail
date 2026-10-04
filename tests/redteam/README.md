# 레드팀 도구 — 외부 공개 프레임워크 연동

세 도구가 **역할이 다르다.** 섞어 쓰면 숫자의 출처가 흐려진다.

| 도구 | ★ | 역할 | 숫자의 출처인가 |
|---|---|---|---|
| `scripts/eval.py` (자작) | — | **발표·문서에 싣는 숫자** | ✅ 유일 |
| promptfoo | 25.7k | CI 회귀 게이트 | ❌ 통과/실패만 |
| garak | 9.4k | probe 코퍼스 채굴 · 내구성 | ❌ |

## promptfoo — CI 게이트

라벨 코퍼스가 회귀하지 않는지만 본다. **공격이 그대로 통과하지 않는가 /
정상이 막히지 않는가** 두 가지만 단정한다. 임계치를 조금 만질 때마다 CI 가
깨지면 아무도 CI 를 안 보게 되기 때문이다.

```bash
# 1) 앱을 띄운다
uvicorn app.main:app --port 8088
# 2) 코퍼스에서 테스트를 생성한다 (코퍼스가 바뀌면 다시)
python3 scripts/gen_promptfoo_tests.py
# 3) 돌린다
cd tests/redteam && npx promptfoo@latest eval
```

2026-10-04 기준 **186건 중 185건 통과 (2초)**.
`/api/inspect` 가 `clearance` 를 받지 않아 RAG 권한 항목은 기본 등급으로 돈다 —
권한별 측정은 `scripts/eval.py` 쪽이 정확하다.

## garak — probe 코퍼스와 내구성

garak 은 본래 **생성 모델**이 나쁜 것을 뱉었는지 보는 도구다. 우리 타깃은
분류기라 garak 의 판정부는 반만 맞는다. 그래서 두 가지로만 쓴다.

1. 37개 probe 모듈의 **공격 문자열을 끌어다 쓰는 것**
2. 수백 건을 연속으로 때렸을 때 게이트웨이가 죽지 않는지

```bash
python -m garak --model_type rest -G tests/redteam/garak-rest.json \
  --probes encoding.InjectBase64 --generations 1
```

2026-10-04 기준 base64 인젝션 **probe 256건 전송, 전량 정상 응답**.

## 왜 자작 하네스를 따로 두는가

발표 표에 들어가는 숫자는 **재현 가능하고 방어 가능**해야 한다.
`scripts/eval.py` 는 라벨과 오탐까지 보고, 코퍼스가 저장소 안에 있어
누구나 같은 숫자를 다시 뽑을 수 있다. 「promptfoo 가 그랬다」는 근거가 약하다.
