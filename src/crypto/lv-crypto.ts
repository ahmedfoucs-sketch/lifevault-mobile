/**
 * lv-crypto.ts — LifeVault AI E2EE primitives.
 * Mirrors the golden Web Crypto reference:
 *  - PBKDF2-SHA256 (600,000 iterations) on NFKC-normalized password
 *  - HKDF-SHA256 with empty salt
 *  - AES-256-GCM, blob = IV(12) || ciphertext||tag, AAD as UTF-8 string
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

export const KDF_ITERATIONS = 600_000;
export const IV_LENGTH = 12;

// HKDF info strings — MUST MATCH the web client exactly
export const HKDF_AUTH_KEY_INFO = "lifevault-auth-v1";
export const HKDF_KEK_PW_INFO = "lifevault-kek-v1";
export const HKDF_KEK_RECOVERY_INFO = "lifevault-recovery-kek-v1";
export const HKDF_RECOVERY_AUTH_INFO = "lifevault-recovery-auth-v1";

// AAD strings
export const AAD_DEK_PW = "lifevault|dek|pw|v1";
export const AAD_DEK_RECOVERY = "lifevault|dek|recovery|v1";
export const AAD_ITEM = (type: string, id: string) => `lifevault|item|${type}|${id}|v1`;

export type ItemType = "vault" | "family" | "link" | "memory" | "settings";

const bs = (u: Uint8Array) => u as unknown as BufferSource;

/* ---------- Base64 ---------- */
export function toB64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/* ---------- Core primitives ---------- */
export async function deriveMasterKey(
  password: string,
  salt: Uint8Array,
  iterations: number = KDF_ITERATIONS
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    bs(enc.encode(password.normalize("NFKC"))),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: bs(salt), iterations },
      keyMaterial,
      256
    )
  );
}

export async function hkdf(ikm: Uint8Array, info: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", bs(ikm), "HKDF", false, ["deriveBits"]);
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: bs(new Uint8Array(0)), info: bs(enc.encode(info)) },
      key,
      256
    )
  );
}

export async function seal(rawKey: Uint8Array, data: Uint8Array, aad: string): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await crypto.subtle.importKey("raw", bs(rawKey), "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: bs(iv), additionalData: bs(enc.encode(aad)) },
      key,
      bs(data)
    )
  );
  const out = new Uint8Array(IV_LENGTH + ct.length);
  out.set(iv, 0);
  out.set(ct, IV_LENGTH);
  return out;
}

export async function open(rawKey: Uint8Array, blob: Uint8Array, aad: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", bs(rawKey), "AES-GCM", false, ["decrypt"]);
  const iv = blob.slice(0, IV_LENGTH);
  const ct = blob.slice(IV_LENGTH);
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bs(iv), additionalData: bs(enc.encode(aad)) },
      key,
      bs(ct)
    )
  );
}

/* ---------- Key hierarchy ---------- */
export const deriveAuthKey = (master: Uint8Array) => hkdf(master, HKDF_AUTH_KEY_INFO);
export const deriveKekPw = (master: Uint8Array) => hkdf(master, HKDF_KEK_PW_INFO);
export const deriveKekRecovery = (recoverySecret: Uint8Array) =>
  hkdf(recoverySecret, HKDF_KEK_RECOVERY_INFO);
export const deriveRecoveryAuthKey = (recoverySecret: Uint8Array) =>
  hkdf(recoverySecret, HKDF_RECOVERY_AUTH_INFO);

export const generateDek = () => crypto.getRandomValues(new Uint8Array(32));

export type WrapKind = "pw" | "recovery";

/** Wrap the DEK under a KEK. Returns base64 (ready for the server). */
export async function wrapDek(dek: Uint8Array, kek: Uint8Array, kind: WrapKind = "pw"): Promise<string> {
  return toB64(await seal(kek, dek, kind === "pw" ? AAD_DEK_PW : AAD_DEK_RECOVERY));
}

export async function unwrapDek(wrappedB64: string, kek: Uint8Array, kind: WrapKind = "pw"): Promise<Uint8Array> {
  return open(kek, fromB64(wrappedB64), kind === "pw" ? AAD_DEK_PW : AAD_DEK_RECOVERY);
}

/* ---------- Items ---------- */
export async function encryptItem(
  dek: Uint8Array,
  type: ItemType,
  id: string,
  payload: unknown
): Promise<string> {
  return toB64(await seal(dek, enc.encode(JSON.stringify(payload)), AAD_ITEM(type, id)));
}

export async function decryptItem<T = unknown>(
  dek: Uint8Array,
  type: ItemType,
  id: string,
  ciphertextB64: string
): Promise<T> {
  const plain = await open(dek, fromB64(ciphertextB64), AAD_ITEM(type, id));
  return JSON.parse(dec.decode(plain)) as T;
}

/* ---------- Recovery key ---------- */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** 32 random bytes + human-friendly Base32 (groups of 4) for display/printing. */
export function generateRecoveryKey(): { secret: Uint8Array; display: string } {
  const secret = crypto.getRandomValues(new Uint8Array(32));
  let bits = 0, value = 0, out = "";
  for (const byte of secret) {
    value = ((value << 8) | byte) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return { secret, display: out.match(/.{1,4}/g)!.join("-") };
}

export function parseRecoveryKey(display: string): Uint8Array {
  const clean = display.replace(/[\s-]/g, "").toUpperCase();
  const bytes: number[] = [];
  let bits = 0, value = 0;
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error("Invalid recovery key character");
    value = ((value << 5) | idx) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes.slice(0, 32));
}

export function wipe(...arrays: Uint8Array[]) {
  for (const a of arrays) a.fill(0);
}

/* ---------- Self-test ---------- */
export interface CompatReport {
  ok: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
}

const eq = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Round-trip self-test. Proves internal consistency (and that WebCrypto works
 * on this device). It does NOT prove byte-compatibility with the web client —
 * the definitive test is logging in against the real server and decrypting an
 * item that the web client created.
 */
export async function verifyCompatibility(): Promise<CompatReport> {
  const checks: CompatReport["checks"] = [];
  const run = async (name: string, fn: () => Promise<boolean>) => {
    try {
      checks.push({ name, ok: await fn() });
    } catch (e: any) {
      checks.push({ name, ok: false, detail: String(e?.message ?? e) });
    }
  };

  const salt = crypto.getRandomValues(new Uint8Array(16));

  await run("base64 round-trip", async () => {
    const x = crypto.getRandomValues(new Uint8Array(60_000));
    return eq(fromB64(toB64(x)), x);
  });

  await run("PBKDF2 deterministic + NFKC", async () => {
    const a = await deriveMasterKey("pässword", salt, 1000);
    const b = await deriveMasterKey("pässword", salt, 1000); // decomposed form
    const c = await deriveMasterKey("pässword", salt, 1000); // precomposed form
    return a.length === 32 && eq(a, c) && eq(a, b);
  });

  await run("HKDF domain separation", async () => {
    const m = crypto.getRandomValues(new Uint8Array(32));
    const a = await deriveAuthKey(m);
    const k = await deriveKekPw(m);
    return !eq(a, k) && eq(a, await deriveAuthKey(m));
  });

  await run("DEK wrap/unwrap (pw)", async () => {
    const m = crypto.getRandomValues(new Uint8Array(32));
    const dek = generateDek();
    const w = await wrapDek(dek, await deriveKekPw(m), "pw");
    return eq(await unwrapDek(w, await deriveKekPw(m), "pw"), dek);
  });

  await run("DEK wrap/unwrap (recovery) + key parse", async () => {
    const { secret, display } = generateRecoveryKey();
    const parsed = parseRecoveryKey(display);
    if (!eq(parsed, secret)) return false;
    const dek = generateDek();
    const w = await wrapDek(dek, await deriveKekRecovery(secret), "recovery");
    return eq(await unwrapDek(w, await deriveKekRecovery(parsed), "recovery"), dek);
  });

  await run("AAD mismatch is rejected", async () => {
    const dek = generateDek();
    const ct = await encryptItem(dek, "vault", "id-1", { a: 1 });
    try {
      await decryptItem(dek, "vault", "id-2", ct);
      return false;
    } catch {
      return true;
    }
  });

  await run("item encrypt/decrypt", async () => {
    const dek = generateDek();
    const obj = { title: "اختبار", n: 42 };
    const ct = await encryptItem(dek, "memory", "abc", obj);
    return JSON.stringify(await decryptItem(dek, "memory", "abc", ct)) === JSON.stringify(obj);
  });

  return { ok: checks.every((c) => c.ok), checks };
}
