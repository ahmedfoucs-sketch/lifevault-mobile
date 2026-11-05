# LIVE OPS monitoring boundary — LifeVault AI

This project participates in AI COMMAND CENTER LIVE OPS through operational metadata only.

## Existing verified sources
- GitHub Actions workflow: `.github/workflows/android-build.yml`
- Web asset build, Capacitor sync, Android debug APK build, and artifact verification

## Safe events to expose
- Android build workflow started/completed/failed
- Web build and Android Gradle task outcome
- Artifact present/missing and build duration
- Sanitized application startup/crash category only after a reviewed runtime adapter is added

## Strict exclusions
Do not export vault contents, personal documents, memory records, family data, certificates, account identifiers, local database contents, environment variables, or credentials.

## Current status
GitHub Actions is the available source for build telemetry. The current Android workflow is a build pipeline, not a continuously running agent. No live mobile runtime feed is connected. Missing runtime data must remain UNKNOWN / NOT CONNECTED. No LifeVault features or personal data are changed by this monitoring note.
