import { expect, it } from "vitest";
import { modulePath, moduleUrl } from "./module-path";
it("keeps callbacks and query strings inside Month End on a shared origin", () => {
  expect(moduleUrl("/auth/callback?next=/reset-password", "https://endvora.com/month-end").href)
    .toBe("https://endvora.com/month-end/auth/callback?next=/reset-password");
  expect(moduleUrl("/app/inventory/counts", "https://endvora.com/month-end").href)
    .toBe("https://endvora.com/month-end/app/inventory/counts");
});
it("does not double-prefix already mounted paths", () => {
  expect(modulePath("/month-end/app")).toBe("/month-end/app");
  expect(modulePath("/month-end?choose=1")).toBe("/month-end?choose=1");
});
it("rejects paths that could escape the module via another host", () => {
  expect(() => modulePath("//evil.example")).toThrow();
  expect(() => modulePath("https://evil.example")).toThrow();
});
