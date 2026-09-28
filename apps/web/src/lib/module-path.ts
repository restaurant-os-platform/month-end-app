export const MODULE_BASE_PATH = "/month-end";

// Raw browser URLs and Route Handler redirects do not receive Next's basePath.
// next/link and next/navigation redirects already add it and must stay unprefixed.
export function modulePath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Expected a module-relative path");
  if (path === MODULE_BASE_PATH || path.startsWith(`${MODULE_BASE_PATH}/`) || path.startsWith(`${MODULE_BASE_PATH}?`)) return path;
  return `${MODULE_BASE_PATH}${path}`;
}

export function moduleUrl(path: string, origin: string | URL) {
  return new URL(modulePath(path), origin);
}
