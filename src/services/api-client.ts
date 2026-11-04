/**
 * LifeVault local-first client.
 * Account metadata and encrypted records stay in this browser's IndexedDB.
 * The master password and DEK are never persisted; records are AES-GCM encrypted.
 */
import {
  deriveMasterKey, deriveKekPw, generateDek, wrapDek, unwrapDek,
  encryptItem, decryptItem, fromB64, toB64, wipe, KDF_ITERATIONS,
  type ItemType,
} from "../crypto/lv-crypto";
import { createLocalAccount, getLocalAccount, listLocalItems, saveLocalItem } from "./local-db";

export const LOCAL_ONLY_MODE = true;
export const API_BASE: string =
  (import.meta as any).env?.VITE_API_BASE || "http://127.0.0.1:8001/api/v1";

export const PATH = {
  prelogin: "/auth/prelogin", login: "/auth/login",
  twoFaSetup: "/auth/2fa/setup", twoFaEnable: "/auth/2fa/enable",
  twoFaDisable: "/auth/2fa/disable", passwordForgot: "/auth/password/forgot",
  passwordBegin: "/auth/password/begin", passwordReset: "/auth/password/reset",
  syncPush: "/sync/push", syncPull: "/sync/pull", recoveryRotate: "/auth/recovery/rotate",
} as const;

export interface PreloginResponse {
  kdf_algo: "pbkdf2-sha256"; kdf_salt: string; kdf_iterations: number;
}
export interface LoginResponse {
  user_id: string; key_version: number; sync_rev: number;
  wrapped_dek_pw: string; access_token: string; [k: string]: unknown;
}
export interface PushItem {
  item_id: string; item_type: ItemType; ciphertext: string;
  base_revision: number; deleted: boolean;
}
export interface PullItem {
  item_id: string; item_type?: ItemType; ciphertext: string;
  revision: number; deleted?: boolean; [k: string]: unknown;
}
export interface PullResponse { sync_rev: number; items: PullItem[]; }

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message?: string) {
    super(message ?? `API error ${status}`);
  }
}
interface Session {
  accessToken: string; userId: string; keyVersion: number; syncRev: number; dek: Uint8Array;
}
let session: Session | null = null;
export const isLoggedIn = () => session !== null;
export const getSession = () => session;
export function logout() {
  if (session) wipe(session.dek);
  session = null;
}

const safeJson = (t: string): unknown => {
  try { return JSON.parse(t); } catch { return t; }
};
export async function request<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json", ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.auth) {
    if (!session) throw new ApiError(401, null, "Not authenticated");
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export interface DeviceInfo { name: string; platform: string; }

/** Create the first local account. Only a salt and password-wrapped DEK are stored. */
export async function registerLocal(emailInput: string, password: string): Promise<void> {
  const email = emailInput.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("أدخل بريدًا إلكترونيًا صحيحًا.");
  if (password.length < 12) throw new Error("كلمة المرور الرئيسية يجب ألا تقل عن 12 حرفًا.");
  if (await getLocalAccount(email)) throw new Error("يوجد حساب بهذا البريد على هذا الجهاز. سجّل الدخول بدلًا من إنشاء حساب جديد.");

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const master = await deriveMasterKey(password, salt, KDF_ITERATIONS);
  const kek = await deriveKekPw(master);
  const dek = generateDek();
  try {
    const wrappedDek = await wrapDek(dek, kek, "pw");
    await createLocalAccount({
      email, salt: toB64(salt), iterations: KDF_ITERATIONS,
      wrappedDek, createdAt: new Date().toISOString(),
    });
  } finally {
    wipe(master, kek, dek, salt);
  }
}

/** Unlock the local account. No network request or password transmission occurs. */
export async function login(
  emailInput: string, password: string, _device: DeviceInfo, _totpCode?: string
): Promise<LoginResponse> {
  const email = emailInput.trim().toLowerCase();
  const account = await getLocalAccount(email);
  if (!account) throw new Error("لا يوجد حساب محلي بهذا البريد. اختر إنشاء حساب جديد أولًا.");
  const master = await deriveMasterKey(password, fromB64(account.salt), account.iterations);
  const kek = await deriveKekPw(master);
  wipe(master);
  let dek: Uint8Array;
  try {
    dek = await unwrapDek(account.wrappedDek, kek, "pw");
  } catch {
    wipe(kek);
    throw new Error("كلمة المرور الرئيسية غير صحيحة.");
  }
  wipe(kek);
  session = { accessToken: "local-only", userId: email, keyVersion: 1, syncRev: 0, dek };
  return {
    user_id: email, key_version: 1, sync_rev: 0,
    wrapped_dek_pw: account.wrappedDek, access_token: "local-only",
  };
}

/* Local-only mode deliberately does not pretend that cloud 2FA or recovery is configured. */
export async function setup2FA(): Promise<{ secret: string; otpauthUri: string }> {
  throw new Error("المصادقة الثنائية غير متاحة في وضع التخزين المحلي. لم يتم تفعيلها.");
}
export async function enable2FA(_code: string): Promise<{ backupCodes: string[] }> {
  throw new Error("المصادقة الثنائية غير متاحة في وضع التخزين المحلي.");
}
export async function disable2FA(_email: string, _password: string, _code: string) {
  throw new Error("المصادقة الثنائية غير متاحة في وضع التخزين المحلي.");
}

export async function syncPush(items: PushItem[]) {
  if (!session) throw new ApiError(401, null, "Not authenticated");
  for (const item of items) {
    const key = `${session.userId}|${item.item_type}|${item.item_id}`;
    await saveLocalItem({
      key, email: session.userId, id: item.item_id, type: item.item_type,
      ciphertext: item.ciphertext, revision: item.base_revision + 1,
      deleted: item.deleted, updatedAt: new Date().toISOString(),
    });
    session.syncRev += 1;
  }
  return { sync_rev: session.syncRev };
}

export async function pushEncrypted(
  type: ItemType, id: string, payload: unknown, baseRevision: number, deleted = false
) {
  if (!session) throw new ApiError(401, null, "Not authenticated");
  const ciphertext = await encryptItem(session.dek, type, id, deleted ? {} : payload);
  return syncPush([{
    item_id: id, item_type: type, ciphertext,
    base_revision: baseRevision, deleted,
  }]);
}

export const syncPull = async (_since: number, _limit = 200): Promise<PullResponse> => {
  throw new Error("المزامنة السحابية غير مفعّلة في إصدار التخزين المحلي.");
};

export interface DecryptedItem<T = unknown> {
  id: string; type: ItemType; revision: number; deleted: boolean; data: T | null;
}

/** Read and decrypt the current account's records from IndexedDB. */
export async function pullAll<T = unknown>(_since = 0, _pageSize = 200) {
  if (!session) throw new ApiError(401, null, "Not authenticated");
  const records = await listLocalItems(session.userId);
  const out: DecryptedItem<T>[] = [];
  let latest = 0;
  for (const item of records) {
    const type = item.type as ItemType;
    const data = item.deleted ? null : await decryptItem<T>(session.dek, type, item.id, item.ciphertext);
    out.push({ id: item.id, type, revision: item.revision, deleted: item.deleted, data });
    latest = Math.max(latest, item.revision);
  }
  session.syncRev = latest;
  return { items: out, syncRev: latest };
}
