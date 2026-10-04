# 표준 매핑 — 우리 탐지기는 무엇에 대응하는가

연구 심사와 기관 도입 검토에서 가장 먼저 찾는 표가 이것이다.
「무언가를 만들었다」가 아니라 **「알려진 위협 분류의 어디를 덮고, 어디를 안 덮는가」**
를 말할 수 있어야 한다.

기준 문서
- **OWASP Top 10 for LLM Applications** — 생성형 AI 애플리케이션 위협 분류
- **MITRE ATLAS** — AI 시스템 공격 전술·기법 체계
- **N2SF** 「국가 망 보안체계 보안 가이드라인 1.0」(국가정보원) — 국내 제도 근거

숫자는 `scripts/eval.py` 실측(코퍼스 **205건**, balanced 프로파일, 한국어 NER 포함) 기준이다.

## 입력 파이프라인

| 우리 탐지기 | finding 카테고리 | OWASP LLM | ATLAS 전술 | N2SF 연결 | 실측 적중 |
|---|---|---|---|---|---|
| `normalizer` | `obfuscation.*` | LLM01 Prompt Injection | Defense Evasion | 프롬프트 필터링 | 8/8 |
| `anomaly` | `anomaly.*` | LLM01 / LLM10 | Reconnaissance | — | — |
| `secrets` | `secret.*` | LLM02 Sensitive Information Disclosure | Exfiltration | 업무정보 유출 방지 | 6/6 |
| `pii` | `pii.*` | LLM02 | Exfiltration | 보안등급 식별 · 민감(S) | 9/9 |
| `presidio_pii` (한국어 NER) | `pii.presidio.*` | LLM02 | Exfiltration | 이름·지명 — 규칙이 못 잡는 자리 | 7/7 |
| `injection` | `injection.*` | **LLM01 Prompt Injection** | ML Attack Staging | 프롬프트 필터링 | 12/12 |
| `harmful` | `harmful.*` | LLM09 Misinformation / 정책 위반 | — | — | 9/9 |
| `rag_access` | `rag.access_violation` | **LLM08 Vector & Embedding Weaknesses** | Discovery · Collection | 승인된 공개(O) 등급 외 차단 | 10/10 |
| `data_classifier` | 등급 라벨 L0~L4 | LLM02 | — | **C/S/O 보안등급 식별** | — |

## 출력 파이프라인

| 우리 탐지기 | finding 카테고리 | OWASP LLM | ATLAS 전술 | 비고 |
|---|---|---|---|---|
| `canary` | `leak.system_prompt_canary` | **LLM07 System Prompt Leakage** | Exfiltration | 오탐 없음 — 토큰이 나오면 유출 확정 |
| `secrets_leak` | `secret.*` | LLM02 | Exfiltration | |
| `pii_leak` | `pii.*` | LLM02 | Exfiltration | 마스킹 풀림 재검사 |
| `exfil` | `exfil.*` | LLM02 / LLM01(간접) | Exfiltration | 마크다운 이미지·링크 반출 |
| `harmful_output` | `harmful.*` | LLM09 | — | 입력 우회 성공분 포착 |
| `refusal_consistency` | `policy.model_complied_with_risky_input` | LLM01 | — | 거절했어야 할 때 안 했는지 |

## 덮지 못하는 것 (정직하게)

| OWASP LLM | 왜 범위 밖인가 |
|---|---|
| LLM03 Supply Chain | 모델·라이브러리 공급망. 게이트웨이의 통제 범위가 아니다 |
| LLM04 Data and Model Poisoning | 학습 단계 위협. 우리는 추론 경로만 본다 |
| LLM05 Improper Output Handling | 호출하는 **애플리케이션**이 책임진다 (SQL/XSS 등) |
| LLM06 Excessive Agency | 에이전트 도구 실행 권한. 현재 구현 범위 밖 |
| LLM10 Unbounded Consumption | `anomaly` 가 길이 폭탄만 부분 대응. 쿼터·과금은 미구현 |

**LLM06 는 다음 확장 후보다.** 교내에 에이전트가 들어오면 도구 실행 단계에
같은 등급 판단을 붙여야 한다 — N2SF 의 「주체·객체」 모델이 그대로 적용된다.

## ATLAS 기법 대응 (주요)

| ATLAS 기법 | 대응 |
|---|---|
| AML.T0051 LLM Prompt Injection | `injection` 6개 기법별 규칙 + `normalizer` 선행 디코딩 |
| AML.T0054 LLM Jailbreak | `injection.role_manipulation` · `harmful` 의도 판정 |
| AML.T0057 LLM Data Leakage | `canary` · `pii_leak` · `secrets_leak` |
| AML.T0024 Exfiltration via ML Inference API | `exfil` · `rag_access` |
| AML.T0043 Craft Adversarial Data | `obfuscation.*` (base64·homoglyph·제로위드스페이스) |

## 갱신 규칙

- 탐지기를 추가·삭제하면 **이 표를 같이 고친다.** 표가 코드를 따라가야 한다.
- 「실측 적중」 열은 `python3 scripts/eval.py` 의 `[2] 탐지기 적중` 값을 옮긴다.
  코퍼스가 바뀌면 다시 재서 갱신한다.
- OWASP·ATLAS 분류 번호는 개정된다. 인용할 때 **판본과 확인 날짜**를 함께 적을 것.
  (이 표는 2026-10-04 기준)

## 재 보고 넣지 않은 것 — ML 인젝션 분류기

같은 코퍼스(205건)로 공개 분류기 둘을 재고 **넣지 않기로 했다.**

| 분류기 | 인젝션 계열 29건 적중 | 정상 128건 오탐 | 규칙 위에 얹었을 때 |
|---|---|---|---|
| protectai deberta-v3 (영어 전용) | 100% | **39.8%** | 새로 잡음 0건 / 새로 막음 51건 |
| proventra mDeBERTa (다국어) | 72.4% | 3.9% | 새로 잡음 0건 / 새로 막음 5건 |
| **규칙 (현행)** | **100%** | **0%** | — |

적중률이 문제가 아니었다 — 영어 전용 모델은 인젝션 29건을 하나도 놓치지 않았다.
**오탐이 문제다.** 정상 한국어 질의 128건 중 51건을 인젝션이라고 한다.
규칙이 이미 29건을 다 잡고 있으므로 분류기의 한계 기여는 **0건**이고, 남는 것은
새로 막히는 정상 질의뿐이다.  어댑터는
`app/guardrail/adapters/transformer_injection.py` 에 남겨 두고 기본값을 끔으로 두었다.

원 수치: `attacks/corpus/results/classifier-comparison-205-2026-10-04.json`,
`classifier-fair-injection-205-2026-10-04.json`.

> `/tmp/mdeberta-pi` 로 받아 둔 「파인튜닝」 가중치는 proventra 모델과 md5 가 같다 —
> 같은 모델이다. 세 종류를 비교한 것이 아니라 **둘**이다.
