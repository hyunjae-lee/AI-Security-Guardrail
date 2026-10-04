# 표준 매핑 — 우리 탐지기는 무엇에 대응하는가

연구 심사와 기관 도입 검토에서 가장 먼저 찾는 표가 이것이다.
「무언가를 만들었다」가 아니라 **「알려진 위협 분류의 어디를 덮고, 어디를 안 덮는가」**
를 말할 수 있어야 한다.

기준 문서
- **OWASP Top 10 for LLM Applications** — 생성형 AI 애플리케이션 위협 분류
- **MITRE ATLAS** — AI 시스템 공격 전술·기법 체계
- **N2SF** 「국가 망 보안체계 보안 가이드라인 1.0」(국가정보원) — 국내 제도 근거

숫자는 `scripts/eval.py` 실측(코퍼스 186건, balanced 프로파일) 기준이다.

## 입력 파이프라인

| 우리 탐지기 | finding 카테고리 | OWASP LLM | ATLAS 전술 | N2SF 연결 | 실측 적중 |
|---|---|---|---|---|---|
| `normalizer` | `obfuscation.*` | LLM01 Prompt Injection | Defense Evasion | 프롬프트 필터링 | 8/8 |
| `anomaly` | `anomaly.*` | LLM01 / LLM10 | Reconnaissance | — | — |
| `secrets` | `secret.*` | LLM02 Sensitive Information Disclosure | Exfiltration | 업무정보 유출 방지 | 5/6 |
| `pii` | `pii.*` | LLM02 | Exfiltration | 보안등급 식별 · 민감(S) | 9/9 |
| `injection` | `injection.*` | **LLM01 Prompt Injection** | ML Attack Staging | 프롬프트 필터링 | 11/12 |
| `harmful` | `harmful.*` | LLM09 Misinformation / 정책 위반 | — | — | 9/9 |
| `rag_access` | `rag.access_violation` | **LLM08 Vector & Embedding Weaknesses** | Discovery · Collection | 승인된 공개(O) 등급 외 차단 | 9/10 |
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
