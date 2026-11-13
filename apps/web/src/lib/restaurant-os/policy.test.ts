import { expect, it } from "vitest";
import { trustedPlatformHome } from "./policy";

it("returns the configured platform home without carrying module paths or query parameters", () => {
  expect(trustedPlatformHome("https://endvora.example/month-end?next=https://other.example"))
    .toBe("https://endvora.example/");
});

it.each([undefined, "invalid", "//other.example", "javascript:alert(1)", "http://endvora.example", "https://user:secret@endvora.example"])(
  "does not expose an untrusted platform destination: %s",
  value => expect(trustedPlatformHome(value)).toBeNull(),
);

it("allows HTTP loopback only during development", () => {
  expect(trustedPlatformHome("http://localhost:3000", true)).toBe("http://localhost:3000/");
  expect(trustedPlatformHome("http://127.0.0.1:3000", true)).toBe("http://127.0.0.1:3000/");
  expect(trustedPlatformHome("http://localhost:3000")).toBeNull();
  expect(trustedPlatformHome("http://endvora.example", true)).toBeNull();
});
