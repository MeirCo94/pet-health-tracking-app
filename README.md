# Watchdog

Help a dog owner see whether their dog is meeting the health goals that matter, whether those are self-set activity goals or targets prescribed by a veterinarian. Works without a wearable, and integrates with existing devices and ecosystems where a real API exists.

One codebase for iOS and Android, built with Expo (React Native) and TypeScript.

## Layout

```
apps/mobile/      Expo app (Expo Router; routes in src/app/)
packages/shared/  Shared types and goal logic, with tests
supabase/         Migrations and RLS policies (see supabase/README.md)
docs/             Decisions and notes
```

The master plan lives in the Watchdog project, not in this repo.

## Setup

Requirements: Node 22 or newer, npm 10 or newer.

```bash
npm ci                        # installs all workspaces
npm run lint                  # ESLint across workspaces
npm run typecheck             # TypeScript across workspaces
npm test                      # unit tests (packages/shared)
cd apps/mobile && npm start   # Expo dev server
```

Use `npx expo install <package>` to add Expo-related packages so versions match the SDK. Native code requires a development build (`eas build --profile development`), because Expo Go only includes its bundled modules.

## Health data

This app tracks activity against goals. It is not a medical device and does not diagnose. Health data is sensitive: never commit real dog or owner records, and use seed fixtures for tests.
