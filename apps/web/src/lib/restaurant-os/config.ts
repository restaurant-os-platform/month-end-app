import "server-only";
export function sharedLoginEnabled() { return process.env.RESTAURANT_OS_SSO_ENABLED === "true"; }
export function appOrigin() {
  const value = process.env.RESTAURANT_OS_MODULE_URL;
  if (!value) throw new Error("Restaurant OS module URL is not configured.");
  const url = new URL(value);
  if (url.protocol !== "https:" && !(process.env.NODE_ENV === "development" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("Module URL requires HTTPS.");
  return url.origin;
}
export function provider(): `custom:${string}` {
  const value = process.env.RESTAURANT_OS_OAUTH_PROVIDER ?? "custom:restaurant-os";
  if (!/^custom:[a-z0-9-]+$/.test(value)) throw new Error("Invalid Restaurant OS provider.");
  return value as `custom:${string}`;
}

export function platformLogoutUrl() {
  const value = process.env.RESTAURANT_OS_URL;
  if (!value) throw new Error("Restaurant OS URL is not configured.");
  return new URL("/logout", value).toString();
}
