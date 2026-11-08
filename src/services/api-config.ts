/**
 * Single source of truth for the LifeVault API endpoint.
 * Development may use the local FastAPI default. Production/mobile builds require HTTPS.
 */
import { resolveApiTarget, type ApiTarget } from "./api-config-core";
export type { ApiConfigError, ApiTarget } from "./api-config-core";

function envValue(key: string): string | undefined {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
  const runtimeEnv = (globalThis as any).process?.env as Record<string, unknown> | undefined;
  const raw = viteEnv?.[key] ?? runtimeEnv?.[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

const viteEnv = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env;
export const API_TARGET: ApiTarget = resolveApiTarget(envValue("VITE_API_BASE"), Boolean(viteEnv?.DEV));
export const API_BASE = API_TARGET.base;

export function apiConfigMessage(target: ApiTarget): string {
  switch (target.error) {
    case "NOT_CONFIGURED": return "الخادم غير مُعدّ في هذه النسخة. يلزم إعداد VITE_API_BASE بعنوان HTTPS قبل البناء.";
    case "INVALID_URL": return "عنوان الخادم المُعدّ غير صالح.";
    case "INSECURE": return `عنوان الخادم يستخدم اتصالًا غير مشفّر (${target.host}). استخدم HTTPS.`;
    default: return "";
  }
}
