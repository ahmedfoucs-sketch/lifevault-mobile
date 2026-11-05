// Real-backend login + encrypted sync smoke test. Test credentials are read from env only.
// Run: LIFEVAULT_API_BASE=https://.../api/v1 LV_TEST_EMAIL=... LV_TEST_PASSWORD=... npx --yes tsx scripts/auth-smoke.ts
import { login, pullAll, logout, API_TARGET } from "../src/services/api-client";

const email = process.env.LV_TEST_EMAIL;
const password = process.env.LV_TEST_PASSWORD;
const apiBase = process.env.LIFEVAULT_API_BASE;

if (!email || !password || !apiBase) {
  console.error("SKIPPED: set LIFEVAULT_API_BASE, LV_TEST_EMAIL and LV_TEST_PASSWORD.");
  process.exit(2);
}
if (API_TARGET.error) {
  console.error("FAIL: API configuration:", API_TARGET.error);
  process.exit(1);
}

try {
  await login(email, password, { name: "LifeVault smoke test", platform: "node" }, process.env.LV_TEST_TOTP);
  const result = await pullAll(0);
  console.log("PASS: authentication and encrypted sync pull completed.");
  console.log("Decrypted item count:", result.items.length);
} catch (error: any) {
  console.error("FAIL: authentication/sync:", error?.status ?? "", error?.message ?? String(error));
  process.exitCode = 1;
} finally {
  logout();
}
