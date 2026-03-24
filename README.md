# Shoe Tracker 10000 - iOS App

## Current Status
- ✅ Web app: Fully functional at https://shoe-tracker-10000.web.app
- ✅ iOS app code: complete with HealthKit sync flow
- ✅ HealthKit entitlement key corrected for Expo/EAS (`com.apple.developer.healthkit`)
- ✅ New Architecture disabled for `rn-apple-healthkit` runtime compatibility

## Architecture
- Frontend: React Native (iOS) + React (Web)
- Backend: Firebase (Auth, Firestore, Hosting)
- Health: rn-apple-healthkit library
- Build: EAS Build with Expo

## Key Files
- `app/index.tsx` - Complete iOS app logic (HealthKit auth/sync + gameplay)
- `app.json` - Config with HealthKit entitlements + expo-build-properties plugin
- `docs/ios-healthkit-go-live.md` - Operational go-live runbook
- `scripts/healthkit_guardrails_check.sh` - Regression check for the 7 known failure modes
- `scripts/healthkit_preflight.sh` - One-command preflight before spending an iOS EAS build

## Regression-Prevention Checks (run before every iOS build)
```bash
./scripts/healthkit_guardrails_check.sh
./scripts/healthkit_preflight.sh
```

Equivalent npm shortcuts:

```bash
npm run healthkit:check
npm run healthkit:preflight
```

If npm says `Missing script: "healthkit:preflight"` you are not on a recent repo state. Run:

```bash
git fetch --all
git checkout work
git pull --ff-only
npm run
```

You should then see `healthkit:check` and `healthkit:preflight` in the script list.

## Next Steps (HealthKit release path)
1. Follow `docs/ios-healthkit-go-live.md` start-to-finish.
2. Run `./scripts/healthkit_preflight.sh`.
3. Run `eas build --platform ios --profile production --clear-cache`.
4. Install on real iPhone and complete in-app auth/sync flow.

## Project Identifiers
- Bundle ID: `com.caddy515.ShoeTrackerHealth`
- Firebase Project: `shoe-tracker-10000`
