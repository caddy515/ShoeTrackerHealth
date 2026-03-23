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
- `app/index.tsx` - Complete iOS app (848 lines)
- `app.json` - Config with HealthKit entitlements + expo-build-properties plugin
- GitHub: All commits tracked

## Next Steps (HealthKit release path)
1. Follow `docs/ios-healthkit-go-live.md` start-to-finish.
2. Run `npx expo prebuild --platform ios --clean`.
3. Run `eas build --platform ios --profile production --clear-cache`.
4. Install on real iPhone and complete in-app auth/sync flow.

## Project Identifiers
- Bundle ID: `com.caddy515.ShoeTrackerHealth`
- Firebase Project: `shoe-tracker-10000`
