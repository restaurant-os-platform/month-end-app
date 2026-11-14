import { expect, it } from "vitest";
import { parseNavigationData, platformLaunchUrl, platformNavigationConfig } from "@/lib/restaurant-os/navigation";

it("enables navigation only for a trusted HTTPS platform configuration", () => {
  expect(platformNavigationConfig(true, "https://endvora.com/workspace", "native")).toEqual({ origin: "https://endvora.com", nativeRestaurantId: "native" });
  for (const value of [undefined, "invalid", "http://endvora.com", "https://user:password@endvora.com"]) expect(platformNavigationConfig(true, value, "native")).toBeNull();
  expect(platformNavigationConfig(false, "https://endvora.com", "native")).toBeNull();
});
it("normalizes the existing platform aliases to the canonical shared host", () => {
  expect(platformNavigationConfig(true, "https://restaurant-os-cyan-ten.vercel.app", "native")?.origin).toBe("https://endvora.com");
});
it("discards unknown selected restaurants instead of choosing another", () => {
  expect(parseNavigationData({ restaurants: [{ id: "kitchen", name: "Kitchen", modules: ["tip-pool"] }], selectedId: "forged" }).selectedId).toBeNull();
});
it("does not accept unrecognized apps or malformed navigation responses", () => {
  for (const value of [null, {}, { restaurants: [{}] }, { restaurants: [{ id: "k", name: "K", modules: ["unassigned-app"] }] }]) expect(() => parseNavigationData(value)).toThrow();
});
it("uses authorized platform launch routes with encoded restaurant context", () => {
  const restaurant = { id: "sample&other=forged", name: "Kitchen", modules: ["month-end" as const] };
  expect(platformLaunchUrl("https://endvora.com", restaurant, "month-end")).toBe("https://endvora.com/modules/month-end?restaurant=sample%26other%3Dforged");
  expect(platformLaunchUrl("https://endvora.com", restaurant, "tip-pool")).toBeNull();
});
it("does not forward internal mapping fields into client navigation data", () => {
  expect(parseNavigationData({ restaurants: [{ id: "k", name: "Kitchen", modules: ["tip-pool"], privateMapping: "secret" }], selectedId: "k" })).toEqual({ restaurants: [{ id: "k", name: "Kitchen", modules: ["tip-pool"] }], selectedId: "k" });
});

import { isSwitcherMessage } from "./navigation";
it("accepts commands only from the expected same-origin inventory frame", () => {
  const source = {};
  expect(isSwitcherMessage({origin:"https://endvora.com",source,data:{type:"endvora:open-switcher"}},source,"https://endvora.com")).toBe(true);
  expect(isSwitcherMessage({origin:"https://other.example",source,data:{type:"endvora:open-switcher"}},source,"https://endvora.com")).toBe(false);
  expect(isSwitcherMessage({origin:"https://endvora.com",source:{},data:{type:"endvora:open-switcher"}},source,"https://endvora.com")).toBe(false);
  expect(isSwitcherMessage({origin:"https://endvora.com",source,data:{type:"other-command"}},source,"https://endvora.com")).toBe(false);
});
