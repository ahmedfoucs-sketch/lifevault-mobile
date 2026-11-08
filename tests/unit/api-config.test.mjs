import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveApiTarget } from "../../.test-dist/services/api-config-core.js";

test("missing API base uses localhost only in development", () => {
  assert.deepEqual(resolveApiTarget(undefined, true), {
    base: "http://127.0.0.1:8001/api/v1", host: "127.0.0.1:8001", error: null
  });
  assert.deepEqual(resolveApiTarget(undefined, false), { base: "", host: "", error: "NOT_CONFIGURED" });
});

test("HTTPS API base is accepted in development and production", () => {
  const expected = { base: "https://api.example.com/api/v1", host: "api.example.com", error: null };
  assert.deepEqual(resolveApiTarget("https://api.example.com/api/v1/", true), expected);
  assert.deepEqual(resolveApiTarget("https://api.example.com/api/v1/", false), expected);
});

test("plain HTTP is accepted only in development", () => {
  assert.equal(resolveApiTarget("http://127.0.0.1:8001/api/v1", true).error, null);
  assert.equal(resolveApiTarget("http://api.example.com/api/v1", false).error, "INSECURE");
});

test("invalid URLs and non-web protocols are rejected", () => {
  assert.equal(resolveApiTarget("not a url", false).error, "INVALID_URL");
  assert.equal(resolveApiTarget("ftp://api.example.com/path", false).error, "INVALID_URL");
});

test("production cannot opt into insecure HTTP", async () => {
  const apiSource = await readFile("src/services/api-config.ts", "utf8");
  assert.ok(!apiSource.includes("VITE_ALLOW_INSECURE"));
  assert.equal(resolveApiTarget("http://api.example.com/api/v1", false).error, "INSECURE");
});
