# LifeVault AI (Vue 3 + Capacitor)

## Current delivery status
The web application passes the GitHub Actions TypeScript check and production Vite build on the personal-commander-phase1-records branch. This does not yet prove a real backend login, sync, Android device run, push notification delivery, or production release.

## Backend configuration (required before login works)
1. Deploy or identify the real LifeVault API backend and confirm its public HTTPS URL.
2. In GitHub: Settings → Secrets and variables → Actions → Variables, add:
   - Name: LIFEVAULT_API_BASE
   - Value: https://<real-api-domain>/api/v1
3. The URL must point to the actual backend. Do not use the example placeholder and do not put secrets in VITE_* variables.
4. The backend must allow the actual web origin and Capacitor origins https://localhost and capacitor://localhost through CORS.

The backend repository/domain is not part of this mobile repository. The application intentionally refuses to silently fall back to phone-localhost in production.

## Build a debug Android APK
1. Open GitHub → Actions → LifeVault Android APK.
2. Select Run workflow on branch personal-commander-phase1-records (or push a change to that branch to trigger its configured workflow).
3. Wait for the workflow to complete successfully.
4. Download the lifevault-android-debug artifact from that run.

The APK is a debug build for testing, not a signed Google Play production release.

## Local web development
- Install dependencies with npm install.
- Start Vite with npm run dev.
- Type-check with npm run typecheck.
- Build with npm run build.

.env.development uses the local FastAPI endpoint http://127.0.0.1:8001/api/v1. This is for local development only.

## Backend checks
- Connectivity and CORS (no credentials): node scripts/api-connectivity.mjs "$LIFEVAULT_API_BASE".
- Authenticated login and encrypted sync pull: use a dedicated disposable test account with LIFEVAULT_API_BASE, LV_TEST_EMAIL, and LV_TEST_PASSWORD, then run npx --yes tsx scripts/auth-smoke.ts.
- Never use a production user's password for smoke testing.

## Security and release boundaries
- The client-side vault encryption code is retained; it has not been independently security-audited.
- Roles/admin controls, enforced MFA policy, device/session revocation, audit logs, backend backup/restore and recovery require backend implementation and verification.
- Finance and asset records are manual entry; there are no bank integrations or payment actions.
- Document records currently store metadata; binary document upload/scan is not implemented in this phase.
- The GitHub CI run reported 9 dependency vulnerabilities (6 moderate, 2 high, 1 critical). Review and remediate the exact npm audit findings before any production release.
- There is currently no committed package-lock.json; dependency installation is not fully reproducible yet.
