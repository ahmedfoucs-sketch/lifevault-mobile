# LifeVault — API environments and mobile connectivity

## API configuration

`src/services/api-config.ts` and `src/services/api-config-core.ts` are the source of truth.

| Build | Configuration | Behaviour |
|---|---|---|
| Vite development | `.env.development` | Local FastAPI default may use `http://127.0.0.1:8001/api/v1` |
| Production web | `VITE_API_BASE` | Required; HTTPS only |
| Android / iOS | `VITE_API_BASE` at build time | Required; HTTPS only; never falls back to device localhost |

There is no production insecure-HTTP override. The previous `VITE_ALLOW_INSECURE` bypass has been removed from the current hardening candidate. HTTP is permitted only for local development. Missing production configuration fails closed with `NOT_CONFIGURED`; malformed URLs and production HTTP are rejected.

A production build may compile without an API URL, but API requests stop with a clear configuration error. It will not silently call localhost or a placeholder endpoint.

## Why this matters

In a phone WebView, `127.0.0.1` means the phone itself, not the developer computer or remote backend. Device builds must use the actual verified HTTPS API endpoint.

## GitHub Actions configuration

Only after the backend owner supplies and verifies the real endpoint, create a repository Actions **Variable** named `LIFEVAULT_API_BASE` containing the public HTTPS base ending in `/api/v1`. A public API URL is configuration, not a secret. Do not invent a domain or set this variable to a placeholder. Never put credentials or private keys in a variable.

The current no-backend smoke workflow intentionally uses `https://api.invalid.example/api/v1` and proves native packaging only. It is not a runtime endpoint and must never be used for login or sync.

## Backend requirements — currently unverified

The authoritative backend must:
- Serve a valid HTTPS certificate and redirect or reject insecure HTTP.
- Use an exact CORS allowlist for the deployed web origin and required Capacitor origins; do not combine wildcard origins with credentials.
- Support required methods and headers, including OPTIONS, POST, Content-Type and Authorization.
- Implement the exact request/response contract in `src/services/api-client.ts`.
- Enforce user/tenant isolation on every record and sync operation.
- Enforce MFA, session expiry/revocation, password recovery and authorization server-side.
- Persist encrypted payloads without logging plaintext or keys.
- Provide auditable migrations, rate limiting, safe error handling, backup and tested restore.
- Keep secrets outside source control and logs.

The current client routes include `/auth/prelogin`, `/auth/login`, `/auth/2fa/setup`, `/auth/2fa/enable`, `/auth/2fa/disable`, password recovery routes, `/sync/push` and `/sync/pull`. The recovery rotation route is marked unverified in code. Backend implementation must be checked route by route; matching names alone are insufficient.

## Historical backend warning

The Library export dated 2026-10-30 is a historical snapshot, not an authoritative current service. Its review identified hardcoded key material, wildcard credentialed CORS, weak password hashing, demo/in-memory account state and a client/server contract mismatch. Do not connect the current client to its old port-8001 demo service or use it with real data.

## Mobile and platform validation

Android packaging is green in GitHub Actions, but no physical-device acceptance has been evidenced. iOS requires macOS, Xcode, an Apple Developer account and authorized signing/provisioning. Linux CI cannot substitute for iOS signing/device acceptance.

## Safe validation sequence

1. Recover current backend source from the authorized Windows workspace.
2. Identify its repository/commit, runtime command, configuration names, database engine and migration process without exposing secret values.
3. Create a disposable test environment and test database; never use production data for initial validation.
4. Review CORS, auth, tenancy, MFA, session lifecycle, recovery, audit and backup/restore.
5. Write contract tests against the current client routes and schemas.
6. Validate HTTPS reachability and CORS without credentials.
7. Run authentication and encrypted sync smoke tests only with a dedicated disposable test account.
8. Configure `LIFEVAULT_API_BASE` only after endpoint and backend security acceptance.

## Validation commands

- Static connectivity/CORS (no credentials): `node scripts/api-connectivity.mjs "$LIFEVAULT_API_BASE"`.
- Auth and encrypted sync pull (disposable test account only): `LIFEVAULT_API_BASE="$LIFEVAULT_API_BASE" LV_TEST_EMAIL="..." LV_TEST_PASSWORD="..." npx --yes tsx scripts/auth-smoke.ts`.
- Never use a production user's password. Do not paste secrets into chat, GitHub issues, source files or CI logs. Clear test credentials from the shell/session after use.

## AI COMMAND CENTER boundary

LifeVault remains an independent application and data boundary. The Command Center may link to an approved production URL and consume privacy-safe operational metadata only; it must not share cookies, tokens, databases or vault contents.
