/** Redirect targets remain on this application, including after URL normalization. */
export function safeNext(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/") || /[\\\u0000-\u0020]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://restaurant-os.invalid");
    return url.origin === "https://restaurant-os.invalid" ? url.pathname + url.search + url.hash : fallback;
  } catch { return fallback; }
}

/** Shared-app links use only the configured platform origin, never request input. */
export function trustedPlatformHome(value: string | undefined, development = false): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = development && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if ((!local && url.protocol !== "https:") || url.username || url.password) return null;
    return new URL("/", url.origin).toString();
  } catch {
    return null;
  }
}
