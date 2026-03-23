# iOS HealthKit Go-Live Runbook

Use this checklist to get the HealthKit-connected build working on a real iPhone and ready for TestFlight.

## 1) Verify Apple capability

1. Open **Apple Developer** → **Certificates, IDs & Profiles**.
2. Open **Identifiers** and select bundle id: `com.caddy515.ShoeTrackerHealth`.
3. Ensure **HealthKit** capability is enabled.
4. Save changes.

## 2) Confirm Expo config

This repo expects HealthKit under:
- `expo.ios.entitlements.com.apple.developer.healthkit = true`
- `expo-build-properties` iOS entitlements with the same key

## 3) Regenerate native config and build

Run from repo root:

```bash
npx expo prebuild --platform ios --clean
```

Then build with EAS:

```bash
eas build --platform ios --profile production --clear-cache
```

If credentials are stale, run:

```bash
eas credentials --platform ios
```

Recreate provisioning profile/certs as needed, then rebuild.

## 4) Install on a physical iPhone

HealthKit requires real-device validation for reliable permission and workout reads.

## 5) In-app validation flow

1. Sign in.
2. Tap **AUTHORIZE HEALTH**.
3. Accept Health permissions.
4. Tap **SYNC WORKOUTS**.
5. Confirm imported workouts appear and can be assigned to shoes.

## 6) Known failure modes and fixes

- **"Could not access Apple Health"**
  - Ensure iPhone has Health app configured and privacy settings allow access.
  - Reinstall app and re-authorize Health permissions.

- **No workouts found**
  - The sync window is the last 30 days.
  - Confirm workouts exist in Apple Health inside that range.

- **Build succeeds but Health auth fails immediately**
  - Re-check App ID capability in Apple Developer.
  - Re-run EAS build after clearing cache.
  - Confirm bundle ID in App Store Connect / Apple Developer matches app config exactly.

## 7) Release readiness checklist

- [ ] HealthKit enabled on App ID
- [ ] Fresh EAS production build generated
- [ ] Real-device authorization successful
- [ ] Workout sync imports records
- [ ] Assigning synced workout creates a shoe log
- [ ] TestFlight internal test completed
