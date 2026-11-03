# PERSONAL LIFE COMMANDER — Phase 1 Structured Records

**Branch:** `personal-commander-phase1-records`  
**Base:** `main`  
**Status:** Implemented in an isolated branch; CI and live-account verification pending.

## What this phase implements

The Commander now has six working record modules:

- Documents: document type, reference, issuer, issue date, expiry date, notes.
- Finance: manually entered financial/account/card record metadata, amount, currency, institution, safe short reference.
- Assets: asset type, location, ownership, estimated value, currency, notes.
- Installments: provider, amount, paid amount, currency, next due date, notes.
- Calendar: event type, date, location/meeting link, notes.
- Family: relationship, occasion/follow-up, date, notes.

Each module supports create, read, update, and delete from the authenticated Commander UI. Records are encrypted client-side and synchronized using the existing LifeVault `memory` item type and existing `pushEncrypted` / `pullAll` API. This deliberately avoids an unverified backend enum/schema migration in this phase.

## Record contract

Each record is stored as an encrypted memory payload with:

- `kind: "commander-record"`
- `commanderRecord: true`
- `schemaVersion: 1`
- `module`: one of documents, finance, assets, installments, calendar, family
- `title`, `fields`, `createdAt`, `updatedAt`

The existing encrypted sync transport, account session, DEK-in-memory behavior, and authentication remain unchanged. The Assistant note list excludes Commander records so the two interfaces do not mix their content.

## Explicit boundaries — not implemented or verified

- This phase stores document metadata only. It does not upload, scan, or attach binary files; the backend's encrypted attachment contract and size limits have not been verified.
- Finance is manual entry only. No bank/card connectors, transaction imports, payment execution, or reconciliation are included.
- Currency is a user-entered label (e.g. SAR or EGP); no FX conversion is performed.
- Expiry dates and installment dates are stored as records. Automatic reminder generation, email/WhatsApp delivery, and background scheduling are not claimed by this phase.
- Calendar entries are stored records, not synchronized with Google/Outlook/device calendars.
- Family records are manually entered organizational notes; no contacts integration or sharing is enabled.
- No real personal data, financial values, account credentials, or documents were added to the repository.

## Security and operational gates before real data

1. Verify the production API URL. The client currently falls back to `http://127.0.0.1:8001/api/v1`; that address is not suitable for access from another computer or phone.
2. Verify HTTPS, authentication, authorization/user isolation, server-side ciphertext handling, request limits, backups, restore, and recovery behavior against the deployed backend.
3. Create a disposable test account and test dataset.
4. Test create/read/update/delete and conflict handling from a real browser against that account.
5. Verify logout/session expiry and confirm no plaintext records appear in network payloads, logs, or browser storage.
6. Only after these gates pass should real personal/financial records be entered.

## Validation

- GitHub Actions typecheck and production build are required on the pull request.
- CI success proves compilation/build only; it does not prove backend reachability, real login, encrypted sync, physical-device behavior, backups, or notification delivery.
