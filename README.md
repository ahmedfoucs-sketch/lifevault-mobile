# LifeVault AI — Local-first encrypted vault

## Current runnable mode

The current web build uses **local-only storage** in the browser's IndexedDB:
- Create a local account from the sign-in screen.
- The master password is never stored or sent over the network.
- A random data-encryption key (DEK) is wrapped by a password-derived key.
- Vault, memory, family, link, and settings payloads are encrypted with AES-256-GCM before being written to IndexedDB.
- The DEK exists in memory only while the user is signed in.

### Important limitations

This is a single-browser/device mode, not a deployed cloud service:
- No cross-device sync, remote account recovery, cloud 2FA, or server backup.
- Clearing browser/site data can permanently remove the local vault.
- Use test data until export/import backup and device recovery are implemented and tested.
- Do not treat this build as a production release for irreplaceable records.

## Run locally

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Open the forwarded Vite port. Choose **إنشاء حساب جديد** on first use. Use a strong master password of at least 12 characters and keep it safe.

## Build and validation

```bash
npm run typecheck
npm run build
```

## Android

The project uses Capacitor. Android packaging is handled by the repository's Android Build workflow. Device installation, secure storage behavior, and notifications still require physical-device validation before release.
