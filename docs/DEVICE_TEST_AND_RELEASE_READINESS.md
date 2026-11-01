# LifeVault AI — Device Test & Release Readiness

Current candidate: `lifevault-premium-ui`
Build commit: `b829f327db498b4a5e27da647636de09c5a51ecb`
Android workflow run: [41358471939](https://github.com/ahmedfoucs-sketch/lifevault-mobile/actions/runs/41358471939)
CI workflow run: [41358471946](https://github.com/ahmedfoucs-sketch/lifevault-mobile/actions/runs/41358471946)

## Verified before device testing
- [x] Web production build completed in GitHub Actions.
- [x] Capacitor Android project generated in CI.
- [x] Capacitor plugins/assets synced in CI.
- [x] Android debug APK assembled successfully.
- [x] APK artifact uploaded as `lifevault-android-debug`.
- [x] General CI workflow completed successfully.
- [ ] APK installed and launched on a physical Android device.
- [ ] Login, encrypted vault read/write, and logout verified on device.
- [ ] Reminder scheduling and notification delivery verified on device.
- [ ] iOS build/device validation completed (separate macOS/Xcode workflow required).

## APK retrieval
1. Open the Android workflow run linked above.
2. In Artifacts, download `lifevault-android-debug`.
3. Extract the ZIP and install `app-debug.apk` on the Android test phone.
4. If Android blocks installation, allow installation from the browser/files app used to open the APK, then retry.

The artifact expires on 2026-11-15. Re-run the Android workflow if it has expired.

## Physical-device test sequence

### A. Installation and launch
- [ ] Install APK without installation errors.
- [ ] Launch app; confirm no blank screen or immediate crash.
- [ ] Confirm Arabic text, layout, and navigation render correctly.
- [ ] Background and reopen the app; confirm it remains stable.

### B. Authentication and encrypted vault
- [ ] Sign in with a test account.
- [ ] Create a disposable test vault entry using non-sensitive test data.
- [ ] Confirm entry appears after refresh/reopen.
- [ ] Edit entry and verify updated values persist.
- [ ] Delete disposable entry and verify it disappears.
- [ ] Sign out; confirm vault state is cleared from the UI.
- [ ] Sign in again and confirm expected server-synced encrypted data is available.

### C. Personal memory
- [ ] Save a disposable note.
- [ ] Search for the note and open it.
- [ ] Confirm category and timestamp display.
- [ ] Reopen app and confirm note persists.

### D. Reminders and notifications
- [ ] Create a reminder for 2–3 minutes in the future.
- [ ] Confirm the reminder review card shows the correct title/date.
- [ ] Confirm reminder is saved only after tapping confirm.
- [ ] Grant notification permission when prompted.
- [ ] Put app in background and wait for the scheduled time.
- [ ] Confirm a generic privacy-safe notification appears.
- [ ] Tap notification and confirm app opens.
- [ ] Repeat with notification permission denied; confirm reminder still saves and app reports notification limitation clearly.
- [ ] Repeat with app force-stopped only as a separate diagnostic; behavior may vary by Android vendor/OS.

### E. Security and privacy checks
- [ ] Use dummy data only; do not enter real passwords or sensitive personal information during initial testing.
- [ ] Confirm lock-screen notification does not reveal reminder title/details.
- [ ] Confirm no plaintext personal content is exposed in notification text.
- [ ] Do not capture or share screenshots containing credentials or private records.

## Known limitations to verify / track
- Reminder parsing is basic: numeric dates, “tomorrow”, and “after N days”; arbitrary natural-language dates/times are not supported.
- Reminder recurrence, advance alerts, and edit/delete notification rescheduling are not implemented.
- Notification delivery has not yet been proven on physical hardware.
- This APK is Android-only. iPhone requires a separate iOS build and signing process on macOS/Xcode.
- The assistant currently provides encrypted note capture and keyword categorization, not an LLM-powered conversational assistant.

## Release gate
Do not merge the draft PR or call this production-ready until:
1. Physical-device smoke tests pass.
2. Reminder notification delivery is demonstrated.
3. Any blocking defects are fixed and CI/APK workflows pass again.
4. The owner explicitly approves merging.
