#!/usr/bin/env node
// Checks public HTTPS reachability and CORS preflight without credentials or user data.
// Usage: node scripts/api-connectivity.mjs https://api.example.com/api/v1
const base = process.argv[2] || process.env.LIFEVAULT_API_BASE;
if (!base) {
  console.error("Usage: node scripts/api-connectivity.mjs https://<host>/api/v1");
  process.exit(2);
}
let parsed;
try { parsed = new URL(base); } catch { console.error("FAIL: invalid API URL"); process.exit(1); }
if (parsed.protocol !== "https:") { console.error("FAIL: production API must use HTTPS"); process.exit(1); }

let failed = false;
async function check(label, fn) {
  try {
    const result = await fn();
    const ok = Boolean(result);
    console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    if (!ok) failed = true;
  } catch (error) {
    console.log(`[FAIL] ${label}: ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}
await check("prelogin endpoint reachable", async () => {
  const response = await fetch(base.replace(/\/+$/, "") + "/auth/prelogin", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "connectivity-check@example.invalid" }),
  });
  return [200, 400, 401, 422].includes(response.status);
});
for (const origin of ["https://localhost", "capacitor://localhost"]) {
  await check(`CORS preflight for ${origin}`, async () => {
    const response = await fetch(base.replace(/\/+$/, "") + "/auth/prelogin", {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,authorization",
      },
    });
    const allowOrigin = response.headers.get("access-control-allow-origin");
    const methods = (response.headers.get("access-control-allow-methods") || "").toUpperCase();
    const headers = (response.headers.get("access-control-allow-headers") || "").toLowerCase();
    return response.ok && allowOrigin === origin && methods.includes("POST")
      && headers.includes("content-type") && headers.includes("authorization");
  });
}
if (failed) process.exit(1);
