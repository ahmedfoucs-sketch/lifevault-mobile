# LIVE OPS monitoring boundary — LifeVault AI

LifeVault participates in AI COMMAND CENTER LIVE OPS through operational metadata only.

## Safe events
- GitHub Actions CI and Android build started/completed/failed.
- Web build and Android Gradle task outcomes.
- Artifact present/missing and build duration.
- Sanitized application startup/crash category only after a reviewed runtime adapter is added.

## Strict exclusions
Never export vault contents, personal documents, memory records, family data, financial records, certificates, account identifiers, local database contents, environment variables or credentials.

## Current status
GitHub Actions is the available source for build telemetry. The Android workflow is a build pipeline, not a continuously running agent. No live mobile runtime feed is connected. Missing runtime data must remain UNKNOWN / NOT CONNECTED. This monitoring contract does not authorize access to personal LifeVault data.
