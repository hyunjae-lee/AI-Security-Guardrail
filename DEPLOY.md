# 배포 가이드

## 이 호스트의 제약

- 포트 **80/443**은 SSL Manager(Caddy, docker)가 사용 중 → 이 앱은 **8088** 사용
- passwordless sudo 없음, 시스템 pip 없음 → 모든 것은 Docker로 실행

## 수동 배포 (즉시)

```bash
cd /home/kaistcert/app/AI-Security-Guardrail
# Presidio + NeMo 탑재 버전 (권장 · CD도 이 버전을 배포)
docker compose -f docker-compose.full.yml up -d --build
# 또는 경량 버전(외부 엔진 미포함): docker compose up -d --build
curl http://127.0.0.1:8088/healthz
```

접속: `http://<host-ip>:8088`
- `/` — 실시간 가드레일 데모
- `/explain/` — 「디지털 국경」 스크롤텔링 설명 사이트

`web/` 번들은 `Dockerfile.full`의 node 스테이지에서 `VITE_BASE=/explain/ npm run build`로 빌드되어 이미지에 포함됩니다 (호스트에 Node 불필요). 로컬 개발은 `cd web && npm run dev` (포트 5173).

## 도메인 (`guardrail.kaist.ac.kr`)

기관 내부망에서 8088 같은 비표준 포트가 막혀 접근이 안 되는 경우가 있어,
이 호스트의 SSL Manager(Caddy)를 앞에 두고 443으로도 서빙합니다.

Caddy 설정은 이 저장소가 아니라 **`/home/kaistcert/workdir/Caddyfile`** 에 있습니다:

```
guardrail.kaist.ac.kr, testcert.kaist.ac.kr {
    reverse_proxy 143.248.4.101:8088
    tls /etc/caddy/certificate/fullchain.crt /etc/caddy/certificate/Wildcard.kaist.ac.kr.key
}
```

- 컨테이너 이름이 아니라 호스트 IP로 넘깁니다. 이 앱은 Caddy와 다른 compose 네트워크에
  있고, CD가 컨테이너를 재생성해도 이 설정이 깨지지 않아야 하기 때문입니다.
- 인증서는 기존 `*.kaist.ac.kr` 와일드카드를 그대로 씁니다(2026-12-17 만료).
- 반영: `docker exec workdir-caddy-1 caddy reload --config /etc/caddy/Caddyfile`
  (컨테이너 재시작 불필요 — Caddyfile은 bind mount).
- DNS: `guardrail.kaist.ac.kr` A → 143.248.4.101 (등록 완료, TTL 86400).
  `testcert` 는 A 레코드가 143.248.4.48 을 가리켜 이 호스트로 오지 않습니다 —
  나중에 돌리면 바로 받도록 이름만 함께 걸어 뒀습니다.

8088 직결은 그대로 열어 둡니다 — CD 헬스체크가 이 포트를 씁니다.

## 자동 배포 (GitHub Actions)

### 1. CI (바로 동작)

GitHub 호스티드 러너에서 실행되므로 추가 설정 없이 push/PR 시 자동 동작합니다:
린트 → 테스트 → Docker 빌드 → 컨테이너 E2E 스모크.

### 2. CD (self-hosted 러너 1회 등록 필요)

CD는 이 호스트에 배포해야 하므로 `guardrail-host` 라벨의 self-hosted 러너가 필요합니다.

> 기존 SSL Manager용 러너는 `kaistsecurity/SSLManager`에 묶여 있어 재사용 불가
> (러너는 repo/org 단위). 이 저장소 전용 러너를 별도로 등록합니다.

배포 호스트에서 한 번만 실행:

```bash
cd /home/kaistcert/app/AI-Security-Guardrail
bash scripts/register-runner.sh
```

이 스크립트는:
1. `~/actions-runner-guardrail`에 러너 바이너리 설치 (없으면 다운로드)
2. `gh`로 등록 토큰 발급 후 `guardrail-host` 라벨로 등록
3. `nohup ./run.sh &`로 백그라운드 실행 (로그: `~/actions-runner-guardrail/runner.log`)

이후 `main` 브랜치에 push하면 CI 성공 후 CD가 자동으로
`docker compose up -d --build` + 헬스체크를 수행합니다.

수동 트리거: GitHub → Actions → **CD (Deploy)** → *Run workflow*.

### 러너를 systemd 서비스로 (선택, sudo 필요)

세션 종료 후에도 유지하려면:

```bash
cd ~/actions-runner-guardrail
sudo ./svc.sh install
sudo ./svc.sh start
```

## 롤백

```bash
docker compose down
# 이전 이미지 태그로 재기동하거나, 이전 커밋 체크아웃 후 up -d --build
```

## 상태 확인

```bash
docker compose ps
docker compose logs -f guardrail
curl -s http://127.0.0.1:8088/api/stats | python3 -m json.tool
```
