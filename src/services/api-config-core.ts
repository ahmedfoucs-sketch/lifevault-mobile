export const DEV_DEFAULT = "http://127.0.0.1:8001/api/v1";

export type ApiConfigError = "NOT_CONFIGURED" | "INVALID_URL" | "INSECURE" | null;
export interface ApiTarget { base: string; host: string; error: ApiConfigError; }

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Resolve API target. HTTP is restricted to loopback during local development. */
export function resolveApiTarget(configured: string | undefined, isDev: boolean): ApiTarget {
  const value = configured?.trim();
  if (!value) {
    return isDev
      ? { base: DEV_DEFAULT, host: "127.0.0.1:8001", error: null }
      : { base: "", host: "", error: "NOT_CONFIGURED" };
  }

  let url: URL;
  try { url = new URL(value); }
  catch { return { base: "", host: "", error: "INVALID_URL" }; }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { base: "", host: url.host, error: "INVALID_URL" };
  }

  const path = url.pathname.replace(/\\/+$/, "");
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    path !== "/api/v1"
  ) {
    return { base: "", host: url.host, error: "INVALID_URL" };
  }

  if (url.protocol !== "https:" && (!isDev || !LOOPBACK_HOSTS.has(url.hostname))) {
    return { base: "", host: url.host, error: "INSECURE" };
  }

  return { base: `${url.origin}${path}`, host: url.host, error: null };
}
