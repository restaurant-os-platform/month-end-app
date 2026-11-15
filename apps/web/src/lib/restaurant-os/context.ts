/** A platform restaurant ID selects context; native membership still grants access. */
export function mappedRestaurant(platformId: string | null): string | null {
  if (!platformId) return null;
  const mappings: unknown = JSON.parse(process.env.RESTAURANT_OS_RESTAURANT_MAP ?? "{}");
  if (!mappings || typeof mappings !== "object" || Array.isArray(mappings)) throw new Error("Invalid restaurant mappings.");
  const map = mappings as Record<string, unknown>;
  const value = Object.hasOwn(map, platformId) ? map[platformId] : null;
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

/** Reverse only a unique configured mapping; this preference never grants access. */
export function platformRestaurant(nativeId: string): string | null {
  try {
    const map: unknown = JSON.parse(process.env.RESTAURANT_OS_RESTAURANT_MAP ?? "{}");
    if (!map || typeof map !== "object" || Array.isArray(map)) return null;
    const matches = Object.entries(map).filter(([, value]) => value === nativeId);
    return matches.length === 1 ? matches[0][0] : null;
  } catch { return null; }
}
