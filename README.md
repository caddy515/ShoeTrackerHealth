# Shoe Tracker 10000 - iOS App

## Current Status
- ✅ Web app: Fully functional at https://shoe-tracker-10000.web.app
- ✅ iOS app code: 848 lines complete, all features implemented
- ⚠️ **BLOCKER**: Apple HealthKit entitlement not syncing through EAS provisioning profiles
  - Manual enable in Apple Dev Portal keeps dropping
  - app.json entitlements not applying
  - expo-build-properties plugin didn't help
  - Tried multiple credential regenerations

## Architecture
- Frontend: React Native (iOS) + React (Web)
- Backend: Firebase (Auth, Firestore, Hosting)
- Health: rn-apple-healthkit library
- Build: EAS Build with Expo

## Key Files
- `app/index.tsx` - Complete iOS app (848 lines)
- `app.json` - Config with HealthKit entitlements + expo-build-properties plugin
- GitHub: All commits tracked

## Next Steps
1. Try building with local Xcode (not EAS) for manual entitlement control
2. Or: Remove HealthKit, ship v1.0, add in Phase 2
3. Or: Find alternative approach to sync with Apple Health

## Credentials
- Apple ID: evan.luscher@gmail.com
- Team ID: 6BQ9CZ54SH
- Bundle ID: com.caddy515.ShoeTrackerHealth
- Firebase Project: shoe-tracker-10000
