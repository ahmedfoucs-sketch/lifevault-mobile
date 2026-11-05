/**
 * Single source of truth for the LifeVault API endpoint.
 * Development may use the local FastAPI default. Production/mobile builds never do.
 */
const DEV_DEFAULT = "http://127.0.0.1:8001/api/v1";

export type ApiConfigError = "NOT_CONFIGURED" | "INVALID_URL" | "INSECURE" | null;
export interface ApiTarget { base: string; host: string; error: ApiConfigError; }

function envValue(key: string): string | undefined {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
  const runtimeEnv = (globalThis as any).process?.env as Record<string, unknown> | undefined;
  const raw = viteEnv?.[key] ?? runtimeEnv?.[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function resolveTarget(): ApiTarget {
  const viteEnv = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env;
  const isDev = Boolean(viteEnv?.DEV);
  const configured = envValue("VITE_API_BASE");
  if (!configured) {
    return isDev
      ? { base: DEV_DEFAULT, host: "127.0.0.1:8001", error: null }
      : { base: "", host: "", error: "NOT_CONFIGURED" };
  }
  let url: URL;
  try { url = new URL(configured); }
  catch { return { base: "", host: "", error: "INVALID_URL" }; }
  const allowInsecure = envValue("VITE_ALLOW_INSECURE") === "true";
  if (url.protocol !== "https:" && !(isDev && url.protocol === "http:") && !allowInsecure) {
    return { base: "", host: url.host, error: "INSECURE" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { base: "", host: url.host, error: "INVALID_URL" };
  }
  return { base: configured.replace(/\/+$/, ""), host: url.host, error: null };
}

export const API_TARGET: ApiTarget = resolveTarget();
export const API_BASE = API_TARGET.base;

export function apiConfigMessage(target: ApiTarget): string {
  switch (target.error) {
    case "NOT_CONFIGURED": return "الخادم غير مُعدّ في هذه النسخة. يلزم إعداد VITE_API_BASE بعنوان HTTPS قبل البناء.";
    case "INVALID_URL": return "عنوان الخادم المُعدّ غير صالح.";
    case "INSECURE": return `عنوان الخادم يستخدم اتصالًا غير مشفّر (${target.host}). استخدم HTTPS.`;
    default: return "";
  }
}
