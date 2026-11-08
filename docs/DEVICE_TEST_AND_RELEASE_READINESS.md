# LifeVault AI — Device Test & Release Readiness

## Current CI candidate

- Repository: `ahmedfoucs-sketch/lifevault-mobile`
- Hardening branch: `hardening/crypto-memory-tests-2026-11-08`
- Latest verified hardening head: `0b46d51a16eeb039b1121c61648194b283c9f7a8`
- Hardening PR: [#10](https://github.com/ahmedfoucs-sketch/lifevault-mobile/pull/10) (draft, open, unmerged)
- CI run: [42454511670](https://github.com/ahmedfoucs-sketch/lifevault-mobile/actions/runs/42454511670) — success
- Android build-smoke run: [42454511717](https://github.com/ahmedfoucs-sketch/lifevault-mobile/actions/runs/42454511717) — success
- Android artifact: `lifevault-android-smoke-no-backend`, ID `13607196295`, expires 2026-11-15.
- Artifact SHA-256 (GitHub ZIP digest): `26c8b3a338cb321644b185c3644b4a2595f28e917b29dac2b3297322c04e3f99`.

## What CI has proven

- [x] Clean dependency install from committed `package-lock.json`.
- [x] Dependency audit enforcement.
- [x] Vue/TypeScript typecheck.
- [x] 17/17 unit tests on the previously verified hardening run.
- [x] Vite production build.
- [x] Capacitor Android platform generation and plugin/assets sync.
- [x] Gradle debug APK assembly, APK existence verification and artifact upload on latest head.

The Android smoke workflow deliberately builds with `https://api.invalid.example/api/v1`. This reserved non-routable host proves packaging only. It cannot authenticate, sync or reach user data. Do not configure this value as a runtime API.

## Still requiring a person/device

- [ ] Install and launch the no-backend APK on a physical Android phone for UI/package smoke only.
- [ ] Verify Arabic RTL, navigation, background/resume, and crash-free launch.
- [ ] Do not attempt login, sync or enter real personal data in this no-backend build.
- [ ] After a secure disposable backend is available, build a separate APK with its verified HTTPS test endpoint and perform full auth/vault/Commander/Second Brain tests using dummy data.
- [ ] Verify reminder scheduling, notification permission handling, privacy-safe lock-screen content, notification tap routing, and rescheduling on physical hardware.
- [ ] Complete iOS simulator/device build and signing on macOS/Xcode with authorized Apple signing assets.

## Physical Android test sequence

### A. Install and launch
- [ ] Install without package/signature errors.
- [ ] Launch; confirm no blank screen or immediate crash.
- [ ] Confirm Arabic RTL, layout and navigation render correctly.
- [ ] Background and reopen the app; confirm stability.

### B. Auth and encrypted storage — only with a secure disposable backend
- [ ] Sign in using a dedicated disposable test account.
- [ ] Create, read, update and delete a dummy vault entry.
- [ ] Confirm persistence after refresh/reopen and expected server sync.
- [ ] Sign out; confirm session and in-memory DEK are cleared.
- [ ] Sign in again and verify only the test account's data is returned.
- [ ] Repeat with a second test account and verify cross-user isolation.

### C. Commander and Second Brain
- [ ] Create/search/update/delete disposable structured records.
- [ ] Test Arabic and English tags and links.
- [ ] Verify logout clears in-memory memory state.
- [ ] Verify no duplicate or parallel personal-record store is created.

### D. Reminders and notifications
- [ ] Create a reminder 2–3 minutes in the future and confirm it.
- [ ] Grant notification permission and verify a generic notification appears in background.
- [ ] Confirm notification text does not disclose title or personal details.
- [ ] Tap notification and confirm correct app routing.
- [ ] Repeat with notification permission denied.
- [ ] Test edit/delete/reschedule behavior; recurrence and advanced natural-language parsing remain unverified.

### E. Security and privacy
- [ ] Use dummy data only.
- [ ] Confirm no plaintext record content or credentials appear in logs or notifications.
- [ ] Do not capture/share screenshots containing credentials or private records.
- [ ] Test logout, session expiry/revocation and cross-account isolation against the disposable backend.

## Release gates

Do not merge PR #8 or PR #10 and do not call LifeVault production-ready until:
1. Authoritative backend source and deployment identity are established.
2. Real HTTPS API and client/server contract pass tests.
3. Authentication, authorization, MFA, session, tenancy and recovery checks pass.
4. Encrypted sync and conflict tests pass against disposable data.
5. Backup and restore drill passes.
6. Physical Android and iOS acceptance gates are completed.
7. Independent security review is complete.
8. The owner explicitly approves release/merge.


## Follow-up verification — 2026-11-08 12:46 Asia/Riyadh

- PR #10 current branch head: `222153c894cb053b876d0d180fb39b7e0c6b09a9`; this latest commit is documentation-only.
- Latest verified code-bearing parent: `a4527e4098f0ae2816620b3bd3e18b8130ecb64`.
- CI run [42455136589](https://github.com/ahmedfoucs-sketch/lifevault-mobile/actions/runs/42455136589): **SUCCESS**; clean dependency install, audit enforcement, typecheck, 17/17 unit tests and Vite production build.
- Android smoke run [42455136623](https://github.com/ahmedfoucs-sketch/lifevault-mobile/actions/runs/42455136623): **SUCCESS**; Java 21 setup, exact dependency install, Vite build with reserved non-routable API, Capacitor generation/sync, Gradle `assembleDebug`, APK verification and artifact upload.
- Both runs were rechecked through GitHub job results on 2026-11-08. The latest documentation-only commit itself has not been separately rerun; no source-code changes are included in it.
- This does not replace physical Android UAT or validate login/sync. The APK uses `https://api.invalid.example/api/v1` and cannot reach a backend.


## Final review note — 2026-11-08

The current hardening CI workflow runs on push to `hardening/*`; PR-triggered runs are restricted to PRs targeting `main`. Since PR #10 targets the PR #8 integration branch, its push-triggered workflow is not exposed by the connector's PR-only commit-run lookup. The latest code-bearing API policy commit `974b8a88754f4ce2a18655a09aa75954b148bfbc` therefore remains **CI-unverified in this session**. Source-level test count is 19 (7 API config + 6 crypto + 6 memory engine). The previously verified 17-test code candidate and Android smoke passed, but do not cover the two additional API-policy cases.
