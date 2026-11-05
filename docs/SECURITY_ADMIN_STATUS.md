# LifeVault — security and administration status

Status labels distinguish client code from backend guarantees.

| Capability | Status | Evidence / limitation |
|---|---|---|
| Client-side vault encryption | VERIFIED IN CLIENT CODE; not independently audited | `src/crypto/lv-crypto.ts`; do not infer server-side encryption from this. |
| Session key held in memory | VERIFIED IN CLIENT CODE | API client session is in memory and DEK is wiped on logout. |
| TOTP setup/enable/disable | CLIENT CALLS ONLY | Backend enforcement and storage are unverified. |
| Roles and permissions / admin console | NOT BUILT IN THIS REPOSITORY | Requires backend authorization and admin UI. |
| Tenant separation | NOT VERIFIED | Requires backend architecture and authorization tests. |
| Device/session revocation | NOT BUILT IN THIS REPOSITORY | Device metadata is sent at login; no verified revocation workflow. |
| Login history / audit logs | NOT BUILT IN THIS REPOSITORY | No verified append-only audit implementation. |
| Server backup and restore | NOT VERIFIED | Backend infrastructure is outside this repository. |
| Server database encryption at rest | NOT VERIFIED | Cannot be established from client code. |
| Recovery-key rotation endpoint | UNVERIFIED | `/auth/recovery/rotate` is marked unverified in the API client. |

## Required backend work
1. Tenant isolation between personal vaults and any future company accounts. Company administrators must never gain access to end-to-end encrypted vault contents.
2. Server-side RBAC checks on every protected route.
3. Enforced MFA policy, hashed one-time recovery codes and secure recovery flows.
4. Server-side session/device registry, revocation and sign-out-everywhere.
5. Append-only, tamper-evident audit events for authentication, role changes, exports and deletion.
6. Encrypted backups, point-in-time recovery and tested restore drills.
7. Rate limiting, account lockout policy, HTTPS/HSTS and strict CORS allow-list.

These backend capabilities must not be advertised as operational until implemented and tested against the real backend.
