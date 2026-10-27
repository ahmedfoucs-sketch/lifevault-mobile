/**
 * api-client.ts — LifeVault AI API client.
 * prelogin / login / 2FA / sync. All crypto is delegated to lv-crypto.ts.
 * API_BASE already ends with /api/v1, so paths below are relative to it.
 */
import {
  deriveMasterKey,
  deriveAuthKey,
  deriveKekPw,
  unwrapDek,
  encryptItem,
  decryptItem,
  fromB64,
  toB64,
  wipe,
  type ItemType,
} from "../crypto/lv-crypto";

export const API_BASE: string =
  (import.meta as any).env?.VITE_API_BASE ?? "http://127.0.0.1:8001/api/v1";

/* ---------- Endpoint paths (relative to API_BASE) ---------- */
export const PATH = {
  prelogin: "/auth/prelogin",
  login: "/auth/login",
  twoFaSetup: "/auth/2fa/setup", // POST, no body -> { secret, otpauth_uri }
  twoFaEnable: "/auth/2fa/enable", // POST { code }
  twoFaDisable: "/auth/2fa/disable", // POST { auth_key, code }
  passwordForgot: "/auth/password/forgot",
  passwordBegin: "/auth/password/begin",
  passwordReset: "/auth/password/reset",
  syncPush: "/sync/push",
  syncPull: "/sync/pull",
  // UNVERIFIED: no known endpoint stores a new recovery-wrapped DEK for a
  // logged-in user. Confirm against auth_routes.py before relying on it.
  recoveryRotate: "/auth/recovery/rotate",
} as const;

/* ---------- Types ---------- */
export interface PreloginResponse {
  kdf_algo: "pbkdf2-sha256";
  kdf_salt: string;
  kdf_iterations: number;
}

export interface LoginResponse {
  user_id: string;
  key_version: number;
  sync_rev: number;
  wrapped_dek_pw: string;
  access_token: string;
  [k: string]: unknown;
}

export interface PushItem {
  item_id: string;
  item_type: ItemType;
  ciphertext: string;
  base_revision: number;
  deleted: boolean;
}

export interface PullItem {
  item_id: string;
  item_type?: ItemType;
  ciphertext: string;
  revision: number;
  deleted?: boolean;
  [k: string]: unknown;
}

export interface PullResponse {
  sync_rev: number;
  items: PullItem[];
}

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message?: string) {
    super(message ?? `API error ${status}`);
  }
}

/* ---------- Session (memory only; DEK is never persisted) ---------- */
interface Session {
  accessToken: string;
  userId: string;
  keyVersion: number;
  syncRev: number;
  dek: Uint8Array;
}
let session: Session | null = null;

export const isLoggedIn = () => session !== null;
export const getSession = () => session;

export function logout() {
  if (session) wipe(session.dek);
  session = null;
}

/* ---------- HTTP ---------- */
const safeJson = (t: string): unknown => {
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
};

export async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.auth) {
    if (!session) throw new ApiError(401, null, "Not authenticated");
    headers["Authorization"] = `Bearer ${session.accessToken}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

/* ---------- Auth ---------- */
export const prelogin = (email: string) =>
  request<PreloginResponse>(PATH.prelogin, { method: "POST", body: JSON.stringify({ email }) });

export interface DeviceInfo {
  name: string;
  platform: string;
}

/** prelogin -> derive keys locally -> login -> unwrap DEK. Server only sees auth_key. */
export async function login(
  email: string,
  password: string,
  device: DeviceInfo,
  totpCode?: string
): Promise<LoginResponse> {
  const pre = await prelogin(email);
  const master = await deriveMasterKey(password, fromB64(pre.kdf_salt), pre.kdf_iterations);
  const authKey = await deriveAuthKey(master);
  const kek = await deriveKekPw(master);

  const body: Record<string, unknown> = { email, auth_key: toB64(authKey), device };
  if (totpCode) body.totp_code = totpCode;

  let resp: LoginResponse;
  try {
    resp = await request<LoginResponse>(PATH.login, { method: "POST", body: JSON.stringify(body) });
  } catch (e) {
    wipe(master, kek);
    throw e;
  } finally {
    wipe(authKey);
  }

  const dek = await unwrapDek(resp.wrapped_dek_pw, kek, "pw");
  wipe(master, kek);

  session = {
    accessToken: resp.access_token,
    userId: resp.user_id,
    keyVersion: resp.key_version,
    syncRev: resp.sync_rev,
    dek,
  };
  return resp;
}

/* ---------- 2FA ---------- */
export async function setup2FA(): Promise<{ secret: string; otpauthUri: string }> {
  const r = await request<any>(PATH.twoFaSetup, { method: "POST", auth: true });
  return { secret: r.secret, otpauthUri: r.otpauth_uri ?? r.otpauthUri ?? "" };
}

/** Response field name for backup codes is assumed: backup_codes | backupCodes | recovery_codes. */
export async function enable2FA(code: string): Promise<{ backupCodes: string[] }> {
  const r = await request<any>(PATH.twoFaEnable, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ code }),
  });
  return { backupCodes: r?.backup_codes ?? r?.backupCodes ?? r?.recovery_codes ?? [] };
}

/** Disabling requires proof of the password: re-derive auth_key locally. */
export async function disable2FA(email: string, password: string, code: string) {
  const pre = await prelogin(email);
  const master = await deriveMasterKey(password, fromB64(pre.kdf_salt), pre.kdf_iterations);
  const authKey = await deriveAuthKey(master);
  try {
    return await request<unknown>(PATH.twoFaDisable, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ auth_key: toB64(authKey), code }),
    });
  } finally {
    wipe(master, authKey);
  }
}

/* ---------- Sync ---------- */
export async function syncPush(items: PushItem[]) {
  if (!session) throw new ApiError(401, null, "Not authenticated");
  return request<Record<string, unknown>>(PATH.syncPush, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ key_version: session.keyVersion, items }),
  });
}

/** Encrypt a plaintext object and push it. */
export async function pushEncrypted(
  type: ItemType,
  id: string,
  payload: unknown,
  baseRevision: number,
  deleted = false
) {
  if (!session) throw new ApiError(401, null, "Not authenticated");
  const ciphertext = await encryptItem(session.dek, type, id, deleted ? {} : payload);
  return syncPush([{ item_id: id, item_type: type, ciphertext, base_revision: baseRevision, deleted }]);
}

export const syncPull = (since: number, limit = 200) =>
  request<PullResponse>(`${PATH.syncPull}?since=${since}&limit=${limit}`, { auth: true });

export interface DecryptedItem<T = unknown> {
  id: string;
  type: ItemType;
  revision: number;
  deleted: boolean;
  data: T | null;
}

/** Pull everything since `since`, paging until drained, decrypting each item. */
export async function pullAll<T = unknown>(since = 0, pageSize = 200) {
  if (!session) throw new ApiError(401, null, "Not authenticated");
  const out: DecryptedItem<T>[] = [];
  let cursor = since;
  let latest = since;

  for (let guard = 0; guard < 10_000; guard++) {
    const page = await syncPull(cursor, pageSize);
    for (const it of page.items) {
      const type = (it.item_type ?? "vault") as ItemType;
      let data: T | null = null;
      if (!it.deleted && it.ciphertext) {
        data = await decryptItem<T>(session.dek, type, it.item_id, it.ciphertext);
      }
      out.push({ id: it.item_id, type, revision: it.revision, deleted: !!it.deleted, data });
      cursor = Math.max(cursor, it.revision);
    }
    latest = Math.max(latest, page.sync_rev);
    if (page.items.length < pageSize || cursor >= page.sync_rev) break;
  }
  session.syncRev = latest;
  return { items: out, syncRev: latest };
}
