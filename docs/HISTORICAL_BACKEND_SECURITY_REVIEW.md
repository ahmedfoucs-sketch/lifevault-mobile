# Historical Backend Snapshot — Security and Compatibility Review

**Review date:** 2026-11-08  
**Source:** Personal Library export `Pasted text(3).txt`, modified 2026-10-30.  
**Authority:** Historical source snapshot only. It is not proven to be the current Windows backend, deployed backend, or the backend intended for the current PR #8 client. No backend repository was present in the connected GitHub repositories at review time.

## Executive finding

The available historical backend snapshot is **not acceptable for production or real personal data**. It contains multiple severe security and contract gaps. It must not be connected to the current encrypted client or exposed publicly without a full source recovery, redesign and security test.

## Findings from the historical snapshot

1. **Legacy static master key:** the older all-in-one FastAPI server defines a fixed master key in source and passes it into the vector-memory constructor. It is not loaded from a protected secret provider or separated from the database. The literal value is intentionally not reproduced here.
2. **Overly permissive CORS:** the legacy server and the separate accounts demo configure wildcard origins together with credentials. Production CORS must use a strict allowlist of exact trusted origins.
3. **Weak password storage:** the legacy auth snippets hash passwords/auth keys with plain SHA-256. The stored salt is not used in the shown hash calculation. Use a dedicated password hashing scheme (Argon2id or scrypt with calibrated parameters), unique salts and constant-time verification. E2EE authentication proof must be designed separately from password storage.
4. **Demo-only accounts service:** the older port-8001 service has hardcoded demo credentials, in-memory users/tokens/vault records, and stores secret fields as plaintext in its process memory. It is not a persistent or secure vault backend.
5. **Authentication failure handling:** the demo `GET /items` catches authentication failures and returns an empty collection instead of a 401. The token lookup shown does not enforce the stored expiry timestamp.
6. **API contract mismatch:** the current client expects `/auth/prelogin`, a KDF algorithm/salt/iteration response, and a login response containing `user_id`, `key_version`, `sync_rev`, `wrapped_dek_pw`, and `access_token`. The historical auth route shown accepts `auth_key` or `password` and returns a nested `user` object; the export does not show a compatible prelogin/wrapped-DEK flow.
7. **Potential sync identity incompatibility:** the historical sync route expects UUID user IDs and device IDs and refers to `api.security.current_user`, `api.db.db`, a PostgreSQL-style schema and an `encrypted_vault_sync` table. The adjacent legacy accounts code uses string-style demo user IDs and does not demonstrate those dependencies. The missing security/database modules and migrations prevent proving that the route can run safely.
8. **No verified recovery or MFA implementation:** the export does not establish server-side enforcement of TOTP, recovery rotation, session revocation, audit logging, backup/restore or tenant isolation for the current API.

## Required disposition

- Treat this snapshot as legacy reference material, not as an approved backend.
- Do not point the current mobile client at the old port-8001 demo service.
- Do not use its demo account or test credentials with any real data.
- Do not copy the static master key into new code, environment examples, CI logs or documentation.
- Recover the current backend source from the user's authorized Windows workspace or an identified repository before attempting remediation.
- Once recovered, first inspect configuration, authentication, schema/migrations, sync isolation, CORS, secrets, audit and backup/restore; then write contract tests against a disposable test database.
- Keep the API base unset for production until a secure, tested HTTPS endpoint exists.

## What this review does not claim

This is not proof that the historical snapshot is currently deployed or that its static key has ever been used in production. No live endpoint was tested, no credentials were used, no service was changed, and no database or user data was accessed.
