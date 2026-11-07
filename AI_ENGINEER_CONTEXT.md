# LifeVault AI — Engineering Context (canonical handover)

Updated: 2026-11-07
Repository: `ahmedfoucs-sketch/lifevault-mobile`
Default branch: `main`
Current unified candidate: PR #8 — `integration/lifevault-commander-second-brain-2026-11-07`

## Product architecture
- PERSONAL LIFE COMMANDER is the management/decision layer inside the existing LifeVault AI application.
- LifeVault AI is the application, encrypted memory, records, vault and storage platform.
- Do not create a second app or separate dashboard for PERSONAL LIFE COMMANDER.
- AI COMMAND CENTER may receive approved operational metadata only. Never export personal records, documents, finance, family or vault contents.
- RAM RCM and SAHM remain separate projects and data boundaries.

## Verified current state
- Existing app stack: Vue 3, TypeScript, Vite, Pinia and Capacitor.
- Main branch has the existing dashboard, vault, assistant and Commander shell.
- PR #6 contains six structured Commander modules: documents, finance, assets, installments, calendar and family.
- Second Brain memory engine/store/view were previously on `lifevault-premium-ui`; these are integrated with the Commander modules on PR #8.
- PR #8 includes protected `/memory` routing, a dashboard shortcut and clearing the memory store on logout.
- Combined CI passed on 2026-11-07, run #42342217900: dependency install, Vue/TypeScript typecheck and Vite production build succeeded (136 modules transformed).
- PR #8 is draft, open, mergeable and not merged.

## Current release blockers
1. Backend source is not present in the connected GitHub repositories. Previous project context locates the local backend under `D:\LifeVault`.
2. No verified public HTTPS API base is available. GitHub Actions variable `LIFEVAULT_API_BASE` is required, ending in `/api/v1`. Android workflow stops before compilation when this is missing.
3. Backend CORS, authentication, user isolation, sync, MFA enforcement, roles, session revocation, audit logs, backup/restore and recovery are not verified.
4. Physical Android installation, vault/Commander/Second Brain CRUD, logout and notification delivery are not verified.
5. npm audit reports 9 vulnerabilities: 6 moderate, 2 high and 1 critical. Main affected packages include `@capacitor/cli`, `vite`, `tar`, `vue-tsc`, `@vue/language-core`, `esbuild`, `glob`, `minimatch` and `rimraf`. Available automatic remediations require major-version jumps; do not run `npm audit fix --force` without compatibility review.
6. No committed `package-lock.json`; reproducible dependency resolution remains outstanding.
7. iOS build/signing requires macOS, Xcode and Apple signing assets.

## Non-negotiable security and delivery rules
- Never weaken or redesign encryption without explicit review.
- Never commit secrets, tokens, private keys, real personal data or production database files.
- Use dummy data for all initial tests.
- Keep lock-screen notifications generic and privacy-safe.
- Never claim device/backend validation without evidence.
- Work on branches and PRs. Do not merge, deploy, change production configuration or alter production data without explicit owner approval.
