/** Redirect targets remain on this application, including after URL normalization. */
export function safeNext(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/") || /[\\\u0000-\u0020]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://restaurant-os.invalid");
    return url.origin === "https://restaurant-os.invalid" ? url.pathname + url.search + url.hash : fallback;
  } catch { return fallback; }
}
