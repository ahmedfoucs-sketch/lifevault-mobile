# LifeVault AI — Backend Recovery & Owner Handoff

**Status:** BLOCKED pending authoritative backend source recovery  
**Prepared:** 2026-11-08  
**Mobile repository:** `ahmedfoucs-sketch/lifevault-mobile` (public; frontend only)  
**Current hardening branch:** `hardening/crypto-memory-tests-2026-11-08`

## 1. Why backend work is blocked

The mobile repository contains no authoritative backend source. The connected GitHub account exposed four project repositories, and none supplied a current LifeVault backend. The only backend code located in the personal Library is a 2026-10-30 historical export. It is not proven to be the current Windows service or deployed API.

That historical export has unsafe legacy patterns (hardcoded key material, wildcard CORS with credentials, weak password hashing, demo/in-memory auth state) and does not implement the current mobile client's PBKDF2 prelogin + wrapped-DEK login contract. It must not be exposed or used with real personal data.

The GitHub connector can inspect and modify authorized GitHub repository content, but it does not provide access to the user's Windows filesystem, running processes, local databases, localhost service, private environment variables, or physical devices. Therefore it cannot recover `D:\LifeVault` or verify a process running on the user's PC by itself.

## 2. Recommended responsible operators

| Work item | Recommended operator | Reason |
|---|---|---|
| Recover current backend source and identify the running local service | **Claude Code on the user's Windows PC** | It can inspect the actual local filesystem and process/runtime context that this GitHub session cannot access. |
| Security/code review and API contract reconciliation | **ChatGPT + GitHub branch/PR workflow** | The current mobile contract and historical review are available here; changes can be tested and reviewed without production access. |
| Provision disposable backend/database and HTTPS test endpoint | **Windows backend operator / hosting administrator** | Requires access to the actual service, hosting account, DNS/TLS and database environment. |
| Physical Android UAT | **User or authorized Android tester** | Requires a real handset and installation/permission interaction. |
| iOS build/signing | **macOS/Xcode operator with Apple signing authority** | Requires macOS, Xcode and authorized Apple Developer signing assets. |
| Independent production security acceptance | **Independent application-security reviewer** | A second reviewer should validate auth, tenancy, recovery, key handling, backups and operational controls. |

Claude Code is the best first resolver for the source-recovery blocker, not an automatic production deployer. ChatGPT can resume immediately after receiving a sanitized source snapshot or private repository access.

## 3. Exact Windows recovery task

Run this from Claude Code on the Windows machine that previously hosted LifeVault. Do not start by changing code or restarting services.

1. Locate the actual project root and identify all candidate backend folders, entrypoints, dependency manifests, migrations and tests.
2. Identify which backend process is currently running, its executable/command, working directory, bound port and service manager. Record only non-secret process metadata.
3. Determine whether the running service is the same source tree found on disk. Record commit/hash or file timestamps; do not assume port 8001 means the service is current.
4. Inventory configuration **names only**. Never print values of passwords, tokens, API keys, database URLs, encryption keys, TOTP seeds or recovery material.
5. Identify database engine, schema/migration state, backup locations and restore procedure. Do not open, copy, upload or modify production database contents.
6. Run existing tests only against a disposable/test database. Do not run migrations against production.
7. Produce a sanitized source handoff: source files, dependency manifests, migration definitions, tests, and redacted sample configuration. Exclude `.env`, secrets, private keys, databases, uploads, personal files, backups, logs and runtime state.
8. Place backend source in a **private** repository or another owner-approved secure location. Do not commit backend source or private configuration to the public `lifevault-mobile` repository.
9. Report the actual API base URL separately (URL only), whether it has valid HTTPS, and the CORS origin list. Do not include credentials.

### Required recovery report

- Actual project root and backend entrypoint.
- Whether a backend process is currently running; port and executable path.
- Source repository/branch/commit if one exists.
- Framework/runtime and dependency versions.
- Database engine and migration mechanism (no data dump).
- Configuration variable names only; confirm that secret values were not printed.
- API route inventory and current OpenAPI schema, if available.
- Existing auth, MFA, sync, recovery, audit and backup modules.
- Test command and results against disposable data.
- HTTPS endpoint and certificate status (URL only).
- CORS allowlist.
- Missing files, dependencies, credentials/permissions or other blockers.

## 4. Current mobile API contract to reconcile

The current client source is `src/services/api-client.ts`. Required paths include:

- `POST /auth/prelogin`
- `POST /auth/login`
- `POST /auth/2fa/setup`
- `POST /auth/2fa/enable`
- `POST /auth/2fa/disable`
- `POST /auth/password/forgot`
- `POST /auth/password/begin`
- `POST /auth/password/reset`
- `POST /sync/push`
- `GET /sync/pull?since=...&limit=...`
- `POST /auth/recovery/rotate` — explicitly unverified; do not assume it exists.

Login currently expects prelogin fields `kdf_algo`, `kdf_salt`, `kdf_iterations`; login response fields `user_id`, `key_version`, `sync_rev`, `wrapped_dek_pw`, `access_token`. Sync push sends encrypted item ciphertext, item type/id, base revision and deletion marker; sync pull returns encrypted items with revisions and sync revision. Confirm all details against code and tests before implementation.

Do not downgrade client cryptography to fit a legacy backend. If the backend cannot support the contract safely, design and review a versioned migration path.

## 5. Security acceptance checklist

- [ ] No hardcoded secrets or master keys.
- [ ] Password storage uses a suitable password hashing scheme (e.g. Argon2id or scrypt with reviewed parameters); authentication proof is designed separately.
- [ ] Strict CORS allowlist; no wildcard + credentials.
- [ ] Server-side authorization and tenant isolation on every read/write/sync route.
- [ ] MFA enforced server-side; enrollment, disable and recovery tested.
- [ ] Session expiry and revocation enforced server-side.
- [ ] Rate limiting and generic auth errors.
- [ ] Encrypted payloads remain encrypted at rest; no plaintext/key logging.
- [ ] Versioned migrations and least-privilege DB account.
- [ ] Conflict/revision semantics and replay handling tested.
- [ ] Audit events avoid secrets and plaintext personal data.
- [ ] Backup encryption, retention and successful restore drill.
- [ ] Disposable test accounts and database isolated from production.
- [ ] Independent review before release.

## 6. Work that can continue here

- Maintain mobile crypto/auth hardening and deterministic tests.
- Keep API production configuration fail-closed until a real endpoint is verified.
- Prepare contract tests once the sanitized backend schema/source is available.
- Keep the checkpoint current and PRs draft/unmerged.
- Do not merge, deploy, set production variables, modify real data or touch production secrets without explicit owner approval.

## 7. Owner actions needed

1. Ask Claude Code on Windows to execute the recovery task above and produce the sanitized report/source package.
2. Provide the report or grant read-only access to the private backend repository.
3. Provide a physical Android tester/device for launch-only smoke, then later for full E2E with a disposable backend.
4. Provide a macOS/Xcode operator if iOS release is required.

**Do not send passwords, tokens, private keys, database files or real personal records in chat or GitHub.**
