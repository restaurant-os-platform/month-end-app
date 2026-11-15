import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ set: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.set }) }));
vi.mock("@/lib/restaurant-os/config", () => ({ sharedLoginEnabled: () => process.env.RESTAURANT_OS_SSO_ENABLED === "true" }));
import { platformRestaurant } from "./context";
import { rememberPlatformRestaurant } from "./selection";
beforeEach(() => {
 vi.clearAllMocks(); vi.stubEnv("RESTAURANT_OS_SSO_ENABLED", "true");
 vi.stubEnv("RESTAURANT_OS_RESTAURANT_MAP", JSON.stringify({kitchen:"native",other:"second"}));
});
afterEach(() => vi.unstubAllEnvs());
it("remembers only the unique canonical ID for a validated native selection", async () => {
 await rememberPlatformRestaurant("native");
 expect(mocks.set).toHaveBeenCalledWith("restaurant-os-restaurant", "kitchen", expect.objectContaining({path:"/",httpOnly:true,sameSite:"lax"}));
});
it("does not substitute another restaurant for an unmapped native selection", async () => {
 expect(platformRestaurant("unknown")).toBeNull(); await rememberPlatformRestaurant("unknown"); expect(mocks.set).not.toHaveBeenCalled();
});
it("does not guess ambiguous or malformed mappings", async () => {
 for(const map of ['{', '[]','null',JSON.stringify({one:"native",two:"native"})]) {
  vi.stubEnv("RESTAURANT_OS_RESTAURANT_MAP",map); expect(platformRestaurant("native")).toBeNull(); await rememberPlatformRestaurant("native");
 }
 expect(mocks.set).not.toHaveBeenCalled();
});
it("leaves standalone module behavior unchanged", async () => {
 vi.stubEnv("RESTAURANT_OS_SSO_ENABLED","false"); await rememberPlatformRestaurant("native"); expect(mocks.set).not.toHaveBeenCalled();
});
