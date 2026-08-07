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

SSL Manager(Caddy) 뒤에 도메인으로 노출하려면 Caddy 설정에
`reverse_proxy localhost:8088` 을 추가하세요. (이 저장소는 Caddy 설정을 건드리지 않습니다.)

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
