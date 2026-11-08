import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
globalThis.crypto ??= webcrypto;

import {
  deriveMasterKey, encryptItem, decryptItem, generateRecoveryKey, parseRecoveryKey,
  open, seal, toB64, wrapDek, unwrapDek, generateDek, verifyCompatibility
} from "../../.test-dist/crypto/lv-crypto.js";

test("crypto compatibility self-test passes all internal checks", async () => {
  const report = await verifyCompatibility();
  assert.equal(report.ok, true, JSON.stringify(report.checks));
});

test("AES-256 keys and wrapped DEKs must be exactly 32 bytes", async () => {
  await assert.rejects(() => seal(new Uint8Array(16), new Uint8Array([1]), "aad"), /32 bytes/);
  await assert.rejects(() => open(new Uint8Array(16), new Uint8Array(28), "aad"), /32 bytes/);
  await assert.rejects(() => wrapDek(new Uint8Array(16), generateDek()), /32 bytes/);
  const kek = generateDek();
  const malformedWrappedDek = await seal(kek, new Uint8Array(16), "lifevault|dek|pw|v1");
  await assert.rejects(() => unwrapDek(toB64(malformedWrappedDek), kek), /32 bytes/);
});

test("AES-GCM rejects truncated ciphertext before decrypt", async () => {
  await assert.rejects(() => open(generateDek(), new Uint8Array(27), "aad"), /truncated/);
});

test("AES-GCM authenticates item identity and type through AAD", async () => {
  const dek = generateDek();
  const encrypted = await encryptItem(dek, "vault", "item-a", { marker: "dummy" });
  await assert.rejects(() => decryptItem(dek, "vault", "item-b", encrypted));
  await assert.rejects(() => decryptItem(dek, "memory", "item-a", encrypted));
});

test("PBKDF2 rejects invalid salt lengths and iteration counts", async () => {
  await assert.rejects(() => deriveMasterKey("dummy", new Uint8Array(8), 1000), /salt/);
  await assert.rejects(() => deriveMasterKey("dummy", new Uint8Array(16), 0), /iterations/);
});

test("recovery key round-trip and malformed input rejection", () => {
  const generated = generateRecoveryKey();
  assert.deepEqual(parseRecoveryKey(generated.display), generated.secret);
  assert.throws(() => parseRecoveryKey("ABC"), /length/);
  assert.throws(() => parseRecoveryKey("0".repeat(52)), /character/);
});
