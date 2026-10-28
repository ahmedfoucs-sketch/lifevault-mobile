# LifeVault AI (Vue 3 + Capacitor)

1. Upload ALL files (keep paths) to the GitHub repo root, branch `main`.
2. Optional secret `VITE_API_BASE` (HTTPS backend, ends with /api/v1).
3. Actions -> "Android Build" -> Run workflow. APK = artifact `lifevault-debug-apk`.
4. Recommended: run `npm install` once and commit the generated package-lock.json
   (the workflow uses `npm ci` when it exists, `npm install` otherwise).