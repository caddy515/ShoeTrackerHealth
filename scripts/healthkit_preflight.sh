#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "Repo root: $REPO_ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ node is not installed"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm is not installed"
  exit 1
fi

echo "--- Environment ---"
node -v
npm -v

echo "--- Git context ---"
git rev-parse --abbrev-ref HEAD
git log -1 --oneline

echo "--- Install dependencies (if needed) ---"
if [ ! -d node_modules ]; then
  npm ci
else
  if npm ls @react-native-async-storage/async-storage expo-image-picker --depth=0 >/dev/null 2>&1; then
    echo "node_modules present with required HealthKit-related packages; skipping npm ci"
  else
    echo "node_modules is present but missing required packages; running npm ci to repair"
    npm ci
  fi
fi

echo "--- Guardrails check (7 failure modes) ---"
./scripts/healthkit_guardrails_check.sh

echo "--- Static checks ---"
npm run lint
npx tsc --noEmit

echo "--- Expo config (entitlement sanity) ---"
npx expo config --json | rg -n "com.apple.developer.healthkit|newArchEnabled|bundleIdentifier"

echo "✅ Preflight passed. Safe to run EAS iOS build next."
