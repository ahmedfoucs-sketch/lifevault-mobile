# LifeVault AI — AI Command Center Engineering Context

## Scope and operating rules
This is the canonical handover for work coordinated through AI COMMAND CENTER. Work only in `ahmedfoucs-sketch/lifevault-mobile`; never modify SAHM or RAM RCM. Inspect current main, files, commits and CI before each task. Preserve the existing app; no rebuild. Use a focused branch and PR. Never merge, deploy, alter production data or change encryption/storage architecture without explicit owner approval. Do not claim tests or device checks without evidence.

## Product
LifeVault AI (خزنة الحياة الذكية) is a premium personal Second Brain / Life OS for encrypted personal records, memory, documents, family relationships, finance and reminders, with Arabic/English and RTL/LTR. Privacy and encryption are foundational. Never expose secrets in logs, server storage, external AI prompts or lock-screen notifications. Use dummy data in testing.

## Verified repository baseline — 2026-11-02
- Repository: `ahmedfoucs-sketch/lifevault-mobile`; default branch: `main`.
- Main HEAD at synchronization: `10070735de7b06e88eba38c480734c99f0731d82`.
- Stack from main package manifest: Vue 3, TypeScript, Vite, Pinia, Capacitor Android 6.1.2, Local Notifications 6.0.2.
- Main contains the premium dashboard / encrypted-vault and reminder-related implementation; inspect current source before relying on detailed behavior.
- Android Actions run `41474211546` succeeded and uploaded `lifevault-android-debug` (3,472,449 bytes; created 2026-11-02 15:44 UTC). This is a debug artifact, not a signed production release.
- Feature branch `lifevault-premium-ui` is 20 commits ahead and 4 behind main; it has no open merge PR. Do not merge it blindly.
- PR #2 is an open Draft onboarding PR from `agents/lifevault-engineer-context`; it adds this context file only, not application changes. This sync PR supersedes it as the proposed route for placing the canonical context on main.

## Confirmed vs unverified
Confirmed in GitHub source/CI: code exists; web/Android build workflow succeeded; debug APK artifact uploaded.
Not verified: physical Android installation, login/vault read-write/logout on device, notification delivery, iOS build/device validation, production signing, backend connectivity in the user's local environment.
The existing `docs/DEVICE_TEST_AND_RELEASE_READINESS.md` is a useful checklist but contains an older workflow run/build commit and describes reminder limitations. The agent-context branch describes recurrence/edit/delete features that conflict with that checklist. Treat recurrence, advance-alert and edit/delete notification rescheduling as UNVERIFIED until current source and device tests resolve the discrepancy.
The current assistant is not yet established as a full LLM conversational assistant; do not market it as one without source and runtime evidence.

## Security rules
- Never weaken or bypass encryption or silently redesign key management.
- Never store plaintext secrets in localStorage/server-side logs.
- External AI processing must be opt-in and privacy-aware.
- Notifications must be generic and privacy-safe.
- Never commit credentials, tokens, private keys or personal records.

## Next work sequence
1. Audit current reminder source and tests; reconcile recurrence/cancellation claims.
2. Perform documented Android physical-device smoke test using dummy data.
3. Verify authentication, encrypted vault persistence and notification behavior.
4. Create a separate iOS feasibility/build plan.
5. Scope conversational LLM assistant only after privacy boundaries and provider/local-model decisions are approved.

## Delivery and approval
Each change: dedicated branch → tests/build → PR with exact evidence, risks and remaining manual checks. Keep main untouched until the owner explicitly approves. Report commit SHA, CI run and test evidence. No autonomous consequential action.
