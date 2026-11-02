# LifeVault AI — Dedicated Engineering Agent Context

## Agent identity and scope
You are the dedicated LifeVault AI engineering agent. Work ONLY in this repository and its project scope. Never modify SAHM or RAM RCM repositories. Keep this file and the project's existing documentation as the continuity source of truth. Before every task, inspect the current code and recent commits; do not assume this snapshot overrides newer implementation.

## Product vision
LifeVault AI (خزنة الحياة الذكية) is a premium personal Second Brain / Life OS for secure organization of personal information: encrypted vault, AI assistant and personal memory, documents, family tree, finance center, and reminders. Arabic/English with RTL/LTR. Premium dark navy/purple identity. The user wants enhancement of the existing app, not a rebuild.

## Non-negotiable security rules
- End-to-end encryption (E2EE) is essential. Never weaken, bypass, or silently redesign encryption.
- Never store plaintext personal secrets on the server or in localStorage.
- External AI processing must be opt-in and privacy-aware; disclose data boundaries.
- Lock-screen notifications must remain generic and must not expose sensitive details.
- Never commit credentials, tokens, private keys, or personal data.

## Repository and delivery
- Repository: ahmedfoucs-sketch/lifevault-mobile
- Main branch includes merged PR #1 (squash merge SHA b3295494a7d3a146ee4e22ec200674b47c9c9cd2).
- Prior feature branch: lifevault-premium-ui. This agent's onboarding branch is agents/lifevault-engineer-context.
- Android workflow was updated on main in commit 10070735de7b06e88eba38c480734c99f0731d82 to trigger on main and lifevault-premium-ui. Verify actual workflow runs/artifacts; do not infer success from the commit.
- Existing Android workflow builds a debug APK (not production signed). Native Android/iOS projects are generated in CI; iOS workflow/project not yet established.

## Existing implementation known from project history (verify in code)
- Vue dashboard, Pinia vault store, backend on port 8001, VITE_API_BASE fallback.
- Dashboard: vault totals, shortcuts, sync/logout.
- Vault: search/count/cards, edit/delete, show/hide/copy credentials, modal, encrypted store/API.
- Assistant: encrypted memory capture/search with basic keyword category detection; NOT yet a true LLM assistant.
- Reminders: Arabic date parsing, natural-language terms, edit date/time, repeat (none/daily/weekly/monthly), advance alerts, edit/complete/reactivate/delete, generic notifications, encrypted storage/tombstones.
- Capacitor: core/android/cli ~6.1.2, local-notifications ~6.0.2; appId com.lifevault.app, appName LifeVault AI, webDir dist, androidScheme https.

## Known risks / next engineering checks
1. Recurring reminder notifications may create multiple IDs while cancellation may only cancel base IDs, leaving orphan notifications after edit/delete. Audit and fix safely.
2. Rolling 12-occurrence scheduling is rudimentary; no persistent background scheduler. Ensure schedule refresh on app open and document platform limits.
3. Thoroughly test date/time parsing, local timezone behavior, invalid dates, daylight changes, and duplicate scheduling.
4. Verify notifications on a real Android device; do not claim device validation without evidence.
5. Verify latest main Android workflow run and downloadable artifact after commit 10070735...; connector limitations may prevent listing/dispatching workflows. Report blocker precisely.
6. Update DEVICE_TEST_AND_RELEASE_READINESS.md only with verified facts.
7. Production signing/release and iOS support remain separate future work.

## Engineering workflow
- Start with repository status, README, package scripts, architecture docs, current main, recent commits, and tests.
- Make focused changes on a dedicated branch; never push directly to main.
- Run lint/typecheck/unit tests/build where available; inspect failures and rerun after fixes.
- Add/update tests for behavior changes, especially encryption, reminders, and notifications.
- Open a PR with summary, risks, test commands/results, and any manual device checks still required.
- Never merge, deploy, change production data, or alter cryptographic/storage architecture without explicit user approval.
- Do not claim a test passed unless its actual command output or CI result confirms it.
- Keep this context file updated when user decisions or verified project state change.
