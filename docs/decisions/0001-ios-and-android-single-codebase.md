# 0001: Build iOS and Android from one codebase

Status: accepted (2026-11-17)

Decision: Build for iOS and Android together with Expo (React Native) and TypeScript. Test on iOS first, then Android before beta.

Why: One codebase reduces work for a small team and keeps the goal and vet-sharing logic identical on both platforms.

Trade-off: Native features (HealthKit, device sync) need platform-specific code and config plugins. Expo's Continuous Native Generation means native projects are generated, not edited by hand.
