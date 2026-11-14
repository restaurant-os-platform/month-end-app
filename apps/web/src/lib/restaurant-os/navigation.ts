export type PlatformNavigationConfig = { origin: string; nativeRestaurantId: string };
export type NavigationRestaurant = { id: string; name: string; modules: ("tip-pool" | "month-end")[] };
export type PlatformNavigationData = { restaurants: NavigationRestaurant[]; selectedId: string | null };

export function platformNavigationConfig(enabled: boolean, address: string | undefined, nativeRestaurantId: string): PlatformNavigationConfig | null {
  if (!enabled || !address) return null;
  try {
    const url = new URL(address);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const legacyHosts = ["restaurant-os-cyan-ten.vercel.app", "restaurant-os-hamedtavanapour-progs-projects.vercel.app", "www.endvora.com"];
    const origin = legacyHosts.includes(url.hostname) ? "https://endvora.com" : url.origin;
    return { origin, nativeRestaurantId };
  } catch { return null; }
}

export function parseNavigationData(value: unknown): PlatformNavigationData {
  if (!value || typeof value !== "object") throw new Error("Invalid navigation");
  const data = value as Record<string, unknown>;
  if (!Array.isArray(data.restaurants)) throw new Error("Invalid restaurants");
  const restaurants: NavigationRestaurant[] = data.restaurants.map(item => {
    if (!item || typeof item.id !== "string" || !item.id || typeof item.name !== "string" || !Array.isArray(item.modules) || item.modules.some((module: unknown) => module !== "tip-pool" && module !== "month-end")) throw new Error("Invalid restaurant");
    return { id: item.id, name: item.name, modules: item.modules };
  });
  return { restaurants, selectedId: typeof data.selectedId === "string" && restaurants.some(restaurant => restaurant.id === data.selectedId) ? data.selectedId : null };
}

export function platformLaunchUrl(origin: string, restaurant: NavigationRestaurant, module: "tip-pool" | "month-end") {
  if (!restaurant.modules.includes(module)) return null;
  const url = new URL(`/modules/${module}`, origin);
  url.searchParams.set("restaurant", restaurant.id);
  return url.toString();
}

export function isSwitcherMessage(event: { origin: string; source: unknown; data?: { type?: string } }, source: unknown, origin: string) {
  return source != null && event.source === source && event.origin === origin && ["endvora:open-switcher", "endvora:dismiss-switcher"].includes(event.data?.type ?? "");
}
