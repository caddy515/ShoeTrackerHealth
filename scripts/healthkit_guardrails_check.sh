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

require_path() {
  local path="$1"
  local label="$2"
  if [ -e "$path" ]; then
    pass "$label"
  else
    fail "$label (missing path: $path)"
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
require_path assets/images/LOADING.png \
  "bundled loading art asset exists"
require_path scripts/patch_rn_apple_healthkit_workout_permission.js \
  "HealthKit workout permission patch script exists"
require_pattern app/index.tsx 'const LOADING_IMAGE' \
  "app has local loading image component wiring"
forbid_pattern app/index.tsx 'giphy\.com|media\.giphy\.com' \
  "app does not depend on remote GIF hosting"

echo "---- 4) Permission robustness ----"
require_pattern app/index.tsx "Platform\\.OS !== 'ios'" \
  "iOS-only guard present"
require_pattern app/index.tsx 'initHealthKit' \
  "initHealthKit path present"
require_pattern app/index.tsx 'const workoutPermission = .*Workout' \
  "workout permission request exists"
require_pattern app/index.tsx 'read:\s*\[workoutPermission\]' \
  "HealthKit init requests workout-only read access"
require_pattern app/index.tsx '\[HealthAuth\] requesting workout permission' \
  "Health auth logs workout permission request"
forbid_pattern app/index.tsx "callHealthKitCallbackMethod\\(healthKit, 'isAvailable'" \
  "Health auth does not call isAvailable through the generic bridge helper"
forbid_pattern app/index.tsx 'DistanceWalkingRunning|HKQuantityTypeIdentifierDistanceWalkingRunning|StepCount|ActiveEnergyBurned' \
  "workout-only sync does not request distance, steps, or active energy permissions"

echo "---- 5) Sync reliability / dedupe ----"
require_pattern app/index.tsx 'getWorkoutDistanceMeters' \
  "distance normalization helper exists"
require_pattern app/index.tsx 'getWorkoutStartDate' \
  "date normalization helper exists"
require_pattern app/index.tsx 'buildWorkoutFingerprint' \
  "fingerprint helper exists"
require_pattern app/index.tsx 'sourceWorkoutId' \
  "sourceWorkoutId dedupe field exists"
require_pattern app/index.tsx 'existingWorkoutMap' \
  "existing workout map dedupe logic exists"
require_pattern app/index.tsx 'assignedLogId' \
  "assigned log linkage exists"
require_pattern app/index.tsx 'archiveWorkoutDeletion' \
  "workout soft-delete helper exists"
require_pattern app/index.tsx 'deleted:\s*true' \
  "deleted workouts are tombstoned for future dedupe"
require_pattern app/index.tsx 'openEditLogModal' \
  "assigned workout edit flow exists from activity logs"
require_pattern app/index.tsx "callHealthKitCallbackMethodWithTimeout\\(healthKit, 'getSamples'" \
  "workout query uses getSamples bridge call"
require_pattern app/index.tsx "type: 'Workout'" \
  "workout query requests Workout samples"
forbid_pattern app/index.tsx "getDailyDistanceWalkingRunningSamples|getDailyStepCountSamples|getActiveEnergyDailySamples" \
  "legacy distance and metric fallback imports are removed"
require_pattern app/index.tsx "status === 'update'" \
  "duplicate workouts can be refreshed as updates"
require_pattern app/index.tsx 'sourceLabel' \
  "preview/import source labels exist"
require_pattern app/index.tsx 'handleSaveLogEdits' \
  "activity log edit flow exists"
require_pattern app/index.tsx 'SHOW ALL ACTIVITY' \
  "full activity history entry point exists"
require_pattern app/index.tsx "currentPage === 'activity'" \
  "full activity history screen exists"
require_pattern app/index.tsx "currentPage === 'syncPreview'" \
  "import preview screen exists"
require_pattern app/index.tsx 'ASSIGN TO ACTIVE SHOE' \
  "import preview supports direct shoe assignment"
require_pattern app/index.tsx "currentPage === 'help'" \
  "help screen exists"
require_pattern app/index.tsx "setCurrentPage\\('help'\\)" \
  "help screen entry point exists"
forbid_pattern app/index.tsx 'UNASSIGNED HEALTH WORKOUTS|DELETE ALL UNASSIGNED' \
  "legacy unassigned-workout dashboard flow is removed"
require_pattern app/index.tsx 'const activeShoes = shoesByRecentUse\.filter\(\(shoe\) => !shoe\.retired\)' \
  "retired shoes are excluded from assignment choices"
require_pattern app/index.tsx 'handleUpdatePassword' \
  "profile password update flow exists"
require_pattern app/index.tsx 'RETIRE SHOE|RETURN TO ACTIVE' \
  "shoe retirement flow exists"
require_pattern app/index.tsx 'FileSystem\.copyAsync' \
  "photo fallback copies local image into app storage"
require_pattern app/index.tsx 'openPurchaseDatePicker|SELECT PURCHASE DATE' \
  "shoe forms include purchase date picker"
require_pattern app/index.tsx 'most running shoes last about 250 to 450 miles' \
  "shoe lifetime mileage guidance exists"
require_pattern app/index.tsx 'CURRENT MILEAGE' \
  "shoe cards show current mileage wording"
require_pattern app/index.tsx 'USAGE %' \
  "shoe cards show usage percentage"
require_pattern app/index.tsx 'MILES REMAINING' \
  "shoe cards show miles remaining"
require_pattern app/index.tsx 'AVERAGE MILES PER USE' \
  "shoe detail shows average miles per use"
require_pattern app/index.tsx 'LONGEST DISTANCE' \
  "shoe detail shows longest distance"
require_pattern app/index.tsx 'AGE OF SHOE' \
  "shoe detail shows age of shoe"
require_pattern app/index.tsx 'No workouts found' \
  "empty-result user message exists"
require_pattern app/index.tsx 'describeHealthKitReadError' \
  "specific HealthKit read error helper exists"
require_pattern app/index.tsx 'Apple Health sync failed' \
  "user-facing workout fetch failure alert exists"

echo "---- 6) Auth persistence ----"
require_pattern app/index.tsx 'initializeAuth\(' \
  "initializeAuth usage present"
require_pattern app/index.tsx 'getReactNativePersistence\(AsyncStorage\)' \
  "React Native auth persistence configured"
require_pattern app/index.tsx 'return getAuth\(app\)' \
  "auth fallback to getAuth(app) exists"
require_pattern package.json '"@react-native-async-storage/async-storage"' \
  "AsyncStorage dependency present"
require_pattern package.json '"postinstall": "node ./scripts/patch_rn_apple_healthkit_workout_permission\.js"' \
  "postinstall applies HealthKit workout permission patch"

echo "---- 7) Installed dependency contract ----"
require_path node_modules/rn-apple-healthkit \
  "rn-apple-healthkit package directory exists"
require_pattern node_modules/rn-apple-healthkit/Constants/Permissions.js 'Workout:\s*"Workout"' \
  "installed rn-apple-healthkit exposes Workout permission constant"
require_pattern "node_modules/rn-apple-healthkit/docs/getSamples().md" "Workout" \
  "installed rn-apple-healthkit docs include Workout sample type"
require_pattern node_modules/rn-apple-healthkit/RCTAppleHealthKit/RCTAppleHealthKit+Utils.m 'return \[HKObjectType workoutType\];' \
  "installed rn-apple-healthkit maps Workout type to HKWorkout"
require_pattern node_modules/rn-apple-healthkit/RCTAppleHealthKit/RCTAppleHealthKit+Queries.m 'if \(type == \[HKObjectType workoutType\]\)' \
  "installed rn-apple-healthkit has workout query handling"
require_pattern node_modules/rn-apple-healthkit/RCTAppleHealthKit/RCTAppleHealthKit\+TypesAndPermissions\.m '\[@"Workout" isEqualToString:key\]|\[@"Workout" isEqualToString: key\]' \
  "installed rn-apple-healthkit has workout permission patch"

echo "---- 8) Runbook / documented failure modes ----"
require_pattern docs/ios-healthkit-go-live.md 'Known failure modes and fixes' \
  "runbook has failure-mode section"
require_pattern docs/ios-healthkit-go-live.md 'Could not access Apple Health' \
  "runbook includes auth/access failure guidance"
require_pattern docs/ios-healthkit-go-live.md 'No workouts found' \
  "runbook includes empty-workout guidance"
require_pattern docs/ios-healthkit-go-live.md 'Health auth fails immediately' \
  "runbook includes immediate-auth-fail guidance"
require_pattern docs/ios-healthkit-go-live.md 'error getting samples' \
  "runbook includes workout-read failure guidance"

echo

echo "=============================="
echo "Checks complete: ${PASS_COUNT} passed, ${FAIL_COUNT} failed"
echo "=============================="

if [ "$FAIL_COUNT" -ne 0 ]; then
  exit 1
fi
