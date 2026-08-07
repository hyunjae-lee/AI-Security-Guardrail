#!/usr/bin/env bash
# One-time setup: register a GitHub Actions self-hosted runner on THIS host so
# the CD workflow (.github/workflows/cd.yml) can deploy automatically on push
# to main. The runner is labelled `guardrail-host`, which cd.yml targets.
#
# Run this on the deploy host:  bash scripts/register-runner.sh
#
# Requirements: `gh` authenticated with repo scope (already the case here), and
# curl/tar available. Installs the runner under ~/actions-runner-guardrail and
# starts it as a background process that survives logout (nohup).
set -euo pipefail

REPO="hyunjae-lee/AI-Security-Guardrail"
RUNNER_DIR="${RUNNER_DIR:-$HOME/actions-runner-guardrail}"
RUNNER_VERSION="${RUNNER_VERSION:-2.336.0}"
LABELS="guardrail-host"

echo "==> Registering self-hosted runner for $REPO under $RUNNER_DIR"

mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

if [ ! -x "./run.sh" ]; then
  arch="x64"; case "$(uname -m)" in aarch64|arm64) arch="arm64";; esac
  tarball="actions-runner-linux-${arch}-${RUNNER_VERSION}.tar.gz"
  echo "==> Downloading $tarball"
  curl -fsSL -o "$tarball" \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${tarball}"
  tar xzf "$tarball"
  rm -f "$tarball"
fi

echo "==> Requesting a registration token via gh"
REG_TOKEN="$(gh api -X POST "repos/${REPO}/actions/runners/registration-token" --jq .token)"

echo "==> Configuring runner (labels: $LABELS)"
./config.sh --unattended --replace \
  --url "https://github.com/${REPO}" \
  --token "$REG_TOKEN" \
  --name "guardrail-$(hostname)" \
  --labels "$LABELS" \
  --work _work

echo "==> Starting runner in the background (nohup)"
nohup ./run.sh > "$RUNNER_DIR/runner.log" 2>&1 &
echo "    PID $! — logs at $RUNNER_DIR/runner.log"
echo "==> Done. Push to main (or run the CD workflow manually) to deploy."
