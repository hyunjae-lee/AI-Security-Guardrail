# AI Security Guardrail

사용자 프롬프트가 **가드레일 없이** AI 시스템으로 넘어가는 과정과, **가드레일을 통과**하는
과정을 나란히 시각화하는 PoC입니다. 두 경로(무방비 / 방어)를 동시에 실행하고 SSE로 각
파이프라인 단계를 실시간 애니메이션으로 보여줍니다.

![데모](docs/demo-leak.png)

## 무엇을 보여주나

- **무방비 경로**: 프롬프트가 그대로 모델에 전달 → 시스템 프롬프트 유출·개인정보 반복·데이터 반출이 그대로 발생
- **방어 경로**: `입력 파이프라인 → 모델 → 출력 파이프라인`. 위험 요청은 입력에서 차단되고,
  입력을 우회한 요청은 출력 단계(카나리아 토큰 등)에서 차단됩니다 (defense-in-depth)
- **감사 대시보드**: 차단/치환/통과 통계, 탐지 카테고리 분포, 요청별 감사 로그

## 가드레일 구성

입력 파이프라인 (`app/guardrail/`):

| 단계 | 역할 |
|------|------|
| `normalizer` | base64/hex/URL 디코딩, 제로위드스페이스·호모글리프 제거 → 후속 탐지 우회 차단 |
| `anomaly` | 길이 폭탄, 반복 플러드, 문자 체계 혼합, 위조 대화 기록 탐지 |
| `secrets` | API 키·토큰·개인키·DB 접속 문자열 탐지 및 마스킹 (엔트로피 검사로 플레이스홀더 제외) |
| `pii` | 주민번호·카드번호(체크섬 검증)·연락처·계좌·이메일 탐지 및 마스킹 |
| `injection` | 지시 무시·역할 조작·시스템 프롬프트 탈취·구분자 위조 등 기법별 탐지 (다중 기법 시 가중) |
| `harmful` | 무기·악성코드·침입·약물 등 분류. 실행 의도 + 유해 주제일 때만 점수화, 방어 목적 표현은 완화 |
| `rag_access` | **RAG 권한 접근통제 (CLR)** — 학사 지식베이스를 요청자 권한 등급에 따라 검색 단계에서 필터링. 권한 초과(타 학생 성적·인사기록 등) 요청 차단. 같은 질의도 권한이 다르면 다른 답 |
| `data_classifier` | **데이터 분류 5등급** — 프롬프트의 데이터 민감도를 1~5등급으로 분류하고 각 등급의 외부 AI 허용 범위를 제시 (점수와 별개의 분류 라벨 축) |

**점수 방식**: `최악+보강 감쇠`(기본) 또는 `합산`(프레임워크 방식) 선택 가능 (`scoring` 파라미터).

**RAG 권한 등급 (CLR)**: 외부/비로그인(CLR0) · 재학생(CLR1) · 교직원(CLR2) · 학사관리자(CLR3). `clearance` 파라미터로 지정하며 "같은 질의, 다른 답"을 시연합니다.

출력 파이프라인:

| 단계 | 역할 |
|------|------|
| `canary` | 시스템 프롬프트에 심은 카나리아 토큰이 응답에 나타나면 **오탐 없이** 유출 확정 |
| `secrets_leak` / `pii_leak` | 응답에 자격증명/개인정보가 노출되었는지 검사 |
| `exfil` | 마크다운 이미지·링크를 통한 데이터 반출 탐지 |
| `refusal_consistency` | 입력 위험도가 높았는데 모델이 거절하지 않은 경우 표시 |

**정책 프로파일**: `strict` / `balanced` / `permissive` — 위험도 점수 임계치와 카테고리별
차단/마스킹 규칙이 다릅니다. 점수는 단순 합산이 아니라 "최악 항목 + 감쇠된 보강 근거" 방식이라
LOW 여러 개가 CRITICAL 하나를 넘지 못합니다.

### 외부 엔진 연동 — Microsoft Presidio · NVIDIA NeMo Guardrails

`Detector` 프로토콜 기반이라 오픈소스 엔진을 어댑터로 결합합니다. **`Dockerfile.full` /
`docker-compose.full.yml`** 로 빌드하면 두 엔진이 실제로 탑재·실행됩니다 (기본 이미지는 CI
속도를 위해 미포함, 라이브러리 부재 시 내장 탐지기로 자동 폴백).

- **Microsoft Presidio** (`GUARDRAIL_USE_PRESIDIO=1`): spaCy NER 기반으로 영문 이름·주소·기관 등
  정규식이 못 잡는 PII를 추가 탐지. full 이미지에서 **오프라인으로 완전 동작** (상태: 활성).
- **NVIDIA NeMo Guardrails** (`GUARDRAIL_USE_NEMO=1`): 입력 레일(주제 제어·탈옥 자가검사).
  self-check 레일이 LLM을 호출하므로 `ANTHROPIC_API_KEY` 설정 시 완전 활성화 (미설정 시
  "탑재됨(LLM 키 필요)" 상태로 안전하게 비동작).

```bash
# Presidio + NeMo 탑재 버전 실행
docker compose -f docker-compose.full.yml up -d --build
# UI 상단 칩에서 각 엔진의 활성/탑재 상태를 확인할 수 있습니다.
```

## 실행

```bash
docker compose up -d --build
# http://<host>:8088  (80/443은 이 호스트의 SSL Manager가 사용 중이라 8088 사용)
```

| 경로 | 내용 |
|------|------|
| `/` | 실시간 가드레일 데모 (두 레인 · SSE 파이프라인 · 감사 대시보드) |
| `/explain/` | 「디지털 국경」 — 질의가 국경을 넘는 과정을 공항 단면으로 설명하는 스크롤텔링 사이트 |

`/explain/` 번들(`web/`, Vite + GSAP)은 `docker-compose.full.yml` 빌드 시 이미지 안에서
함께 빌드됩니다. 프론트만 따로 개발하려면 `cd web && npm install && npm run dev` (포트 5173).

환경변수:

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `GUARDRAIL_PORT` | `8088` | 서비스 포트 |
| `GUARDRAIL_PROFILE` | `balanced` | 기본 정책 프로파일 |
| `GUARDRAIL_BACKEND` | `mock` | `mock`(재현용 취약 모델) 또는 `claude`(실제 API) |
| `GUARDRAIL_STAGE_DELAY` | `0.28` | SSE 애니메이션 단계 간 지연(초) |
| `ANTHROPIC_API_KEY` | — | `claude` 백엔드 사용 시 필요 |

## API

| 엔드포인트 | 설명 |
|-----------|------|
| `POST /api/stream` | 두 경로 동시 실행 + SSE 단계 스트리밍 (메인 데모) |
| `POST /api/analyze` | `/api/stream`의 비스트리밍 버전 (스크립트/테스트용) |
| `POST /api/inspect` | 모델 호출 없이 가드레일만 실행 (임베더블 게이트웨이 API) |
| `GET /api/audit`, `/api/stats` | 감사 로그 / 통계 |

## 테스트

```bash
docker run --rm -v "$PWD":/w -w /w python:3.12-slim \
  bash -c "pip install -q -r requirements-dev.txt && pytest -q"
```

69개 테스트(탐지기 단위 + 엔진 정책 + API + 라벨링된 공격 코퍼스 평가)를 포함합니다.
공격 샘플은 `attacks/samples.json`에 있으며 데모 프리셋과 평가 테스트에 함께 쓰입니다.

## CI/CD

- **CI** (`.github/workflows/ci.yml`, GitHub 호스티드): ruff 린트 → pytest → Docker 빌드 → 컨테이너 E2E 스모크 테스트
- **CD** (`.github/workflows/cd.yml`, self-hosted `guardrail-host`): main 푸시 시 이 호스트에서 `docker compose up -d --build` 후 헬스체크

자동 배포를 켜려면 배포 호스트에서 한 번만:

```bash
bash scripts/register-runner.sh   # guardrail-host 라벨 러너 등록 + 백그라운드 실행
```

자세한 배포 절차는 [DEPLOY.md](DEPLOY.md) 참고.
