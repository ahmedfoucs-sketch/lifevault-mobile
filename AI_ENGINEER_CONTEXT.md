# LifeVault AI — Engineering Context (canonical handover)

Updated: 2026-11-08 09:30 Asia/Riyadh
Repository: `ahmedfoucs-sketch/lifevault-mobile`
Default branch: `main`
Integration candidate: PR #8 — `integration/lifevault-commander-second-brain-2026-11-07`
Hardening candidate: PR #10 — `hardening/crypto-memory-tests-2026-11-08`
Checkpoint: PR #9 — `docs/lifevault-audit-checkpoint-2026-11-07`

## Product architecture and boundaries
- PERSONAL LIFE COMMANDER is the management/decision layer inside the existing LifeVault AI application.
- LifeVault AI is the application, encrypted memory, records, vault, storage and retrieval platform.
- Do not create a second app or a parallel database for PERSONAL LIFE COMMANDER.
- AI COMMAND CENTER may receive approved operational metadata only. Never export personal records, documents, finance, family or vault contents.
- RAM RCM and SAHM HOLDING remain separate projects and data boundaries.

## Verified engineering state — 2026-11-08
- Stack: Vue 3, TypeScript, Vite, Pinia and Capacitor 7.
- PR #8 is OPEN, DRAFT and unmerged. It integrates the Commander modules and Second Brain on top of the existing app.
- PR #10 is OPEN, DRAFT and unmerged, based on PR #8. Latest verified head: `0b46d51a16eeb039b1121c61648194b283c9f7a8`.
- PR #10 includes KDF parameter validation, key cleanup, AES-256 key/payload validation, recovery-key validation, production HTTPS-only API target policy, Second Brain tag parsing fix, committed lockfile, dependency updates, and 17 unit tests.
- Latest CI run #42454511670 on the current head passed: clean `npm ci`, dependency audit enforcement, Vue/TypeScript typecheck, unit tests and Vite production build.
- Latest Android smoke run #42454511717 on the same head passed: Capacitor Android generation, plugin/assets sync, Gradle debug APK assembly, APK verification and artifact upload. It uses `https://api.invalid.example/api/v1`; it cannot log in or sync.
- Latest Android artifact ID: `13607196295`, expires 2026-11-15.
- PR #9 is OPEN, DRAFT and unmerged. Its checkpoint branch has been updated separately.
- Latest verified CI reports zero npm audit vulnerabilities and 17/17 unit tests passed on the API-transport hardening head; confirm latest run logs before changing this count.
- No merge to main, production deployment, real-data change, secret change, permission change or central dashboard modification was performed.

## API and backend — critical release blocker
- The mobile client consumes `/auth/prelogin`, `/auth/login`, 2FA setup/enable/disable, password recovery, `/sync/push` and `/sync/pull`; `/auth/recovery/rotate` remains explicitly unverified.
- Production and device builds require an explicit HTTPS `VITE_API_BASE` ending in `/api/v1`. Production HTTP overrides are not supported.
- No authoritative current backend source or verified deployed HTTPS endpoint is available in the connected GitHub repositories.
- The Library export `Pasted text(3).txt` dated 2026-10-30 is historical only. It shows a legacy static master key, wildcard CORS with credentials, weak SHA-256 password hashing, demo/in-memory accounts and tokens, and an API contract incompatible with the current client. Do not run it against real data or expose it.
- Do not guess an API hostname or configure a fake endpoint. Keep production API configuration unset until the owner identifies a verified endpoint.
- Backend source is expected to be recovered by the authorized Windows operator (Claude Code on the user's Windows machine) from the actual local workspace, then reviewed in a private repository or secure local workspace. Do not put backend source, environment files, database files or personal data in this public mobile repository.

## Release gates still open
1. Recover and identify the authoritative current backend source and its actual run/deployment identity.
2. Verify the HTTPS API endpoint, certificate, exact CORS allowlist and client/server contract.
3. Review authentication/password hashing, user/tenant isolation, authorization, MFA enforcement, session expiry/revocation, recovery, audit trail and secret handling.
4. Run contract, encrypted sync, conflict, and cross-user isolation tests against a disposable database.
5. Complete backup and restore drills with disposable data.
6. Install the no-backend APK on physical Android for launch/UI checks; run full E2E only after a secure disposable backend is available.
7. Verify reminder scheduling and privacy-safe notifications on physical Android.
8. Build/test iOS on macOS/Xcode with authorized signing assets.
9. Complete independent security review and explicit owner acceptance.
10. Refresh the existing AI COMMAND CENTER telemetry workflow; do not create a duplicate integration.

## Non-negotiable delivery rules
- Never weaken or redesign encryption without explicit review.
- Never commit secrets, tokens, private keys, real personal data, production database files or unredacted logs.
- Use dummy data and disposable test environments for initial tests.
- Keep lock-screen notifications generic and privacy-safe.
- Never claim device/backend validation without evidence.
- Work on branches and PRs. Do not merge, deploy, alter production configuration, permissions or production data without explicit owner approval.
- If Windows, device, macOS/Xcode or service access is unavailable, record the exact blocker and prepare a precise handoff instead of guessing.
