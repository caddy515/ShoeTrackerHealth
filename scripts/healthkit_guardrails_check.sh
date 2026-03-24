#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PASS_COUNT=0
FAIL_COUNT=0

pass() { echo "✅ $1"; PASS_COUNT=$((PASS_COUNT+1)); }
fail() { echo "❌ $1"; FAIL_COUNT=$((FAIL_COUNT+1)); }

require_pattern() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if rg -n --no-heading "$pattern" "$file" >/dev/null 2>&1; then
    pass "$label"
  else
    fail "$label (missing pattern: $pattern in $file)"
  fi
}

forbid_pattern() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if rg -n --no-heading "$pattern" "$file" >/dev/null 2>&1; then
    fail "$label (found forbidden pattern: $pattern in $file)"
  else
    pass "$label"
  fi
}

echo "Repo root: $REPO_ROOT"

echo "---- 1) Entitlement key correctness ----"
require_pattern app.json '"com.apple.developer.healthkit"\s*:\s*true' \
  "app.json has correct HealthKit entitlement key"
forbid_pattern app.json '"com.apple.healthkit"\s*:\s*true' \
  "app.json does NOT use deprecated entitlement key"

echo "---- 2) New architecture compatibility ----"
require_pattern app.json '"newArchEnabled"\s*:\s*false' \
  "newArchEnabled is disabled"

echo "---- 3) Native module / Expo Go guardrails ----"
require_pattern app/index.tsx 'const resolveAppleHealthKit\s*=' \
  "resolveAppleHealthKit helper exists"
require_pattern app/index.tsx 'HealthKit unavailable' \
  "user-facing HealthKit unavailable alert exists"
require_pattern app/index.tsx 'Install an EAS iOS build \(not Expo Go\)' \
  "Expo Go warning message exists"

echo "---- 4) Permission robustness ----"
require_pattern app/index.tsx "Platform\\.OS !== 'ios'" \
  "iOS-only guard present"
require_pattern app/index.tsx 'initHealthKit' \
  "initHealthKit path present"
require_pattern app/index.tsx 'DistanceWalkingRunning|HKQuantityTypeIdentifierDistanceWalkingRunning' \
  "distance permission fallback exists"

echo "---- 5) Sync reliability / dedupe ----"
require_pattern app/index.tsx 'getWorkoutDistanceMeters' \
  "distance normalization helper exists"
require_pattern app/index.tsx 'getWorkoutStartDate' \
  "date normalization helper exists"
require_pattern app/index.tsx 'buildWorkoutFingerprint' \
  "fingerprint helper exists"
require_pattern app/index.tsx 'sourceWorkoutId' \
  "sourceWorkoutId dedupe field exists"
require_pattern app/index.tsx 'existingFingerprints' \
  "dedupe set logic exists"
require_pattern app/index.tsx 'No workouts found' \
  "empty-result user message exists"

echo "---- 6) Auth persistence ----"
require_pattern app/index.tsx 'initializeAuth\(' \
  "initializeAuth usage present"
require_pattern app/index.tsx 'getReactNativePersistence\(AsyncStorage\)' \
  "React Native auth persistence configured"
require_pattern app/index.tsx 'return getAuth\(app\)' \
  "auth fallback to getAuth(app) exists"
require_pattern package.json '"@react-native-async-storage/async-storage"' \
  "AsyncStorage dependency present"

echo "---- 7) Runbook / documented failure modes ----"
require_pattern docs/ios-healthkit-go-live.md 'Known failure modes and fixes' \
  "runbook has failure-mode section"
require_pattern docs/ios-healthkit-go-live.md 'Could not access Apple Health' \
  "runbook includes auth/access failure guidance"
require_pattern docs/ios-healthkit-go-live.md 'No workouts found' \
  "runbook includes empty-workout guidance"
require_pattern docs/ios-healthkit-go-live.md 'Health auth fails immediately' \
  "runbook includes immediate-auth-fail guidance"

echo

echo "=============================="
echo "Checks complete: ${PASS_COUNT} passed, ${FAIL_COUNT} failed"
echo "=============================="

if [ "$FAIL_COUNT" -ne 0 ]; then
  exit 1
fi
