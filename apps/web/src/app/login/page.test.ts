import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), platformHome: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/restaurant-os/config", () => ({ sharedLoginEnabled: () => true, platformHomeUrl: mocks.platformHome }));
vi.mock("./actions", () => ({ login: vi.fn() }));

import LoginPage from "./page";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.platformHome.mockReturnValue("https://endvora.example/");
});

it("offers the shared app home when the account has no native Month End workspace", async () => {
  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({ error: "workspace_access" }) }));
  expect(html).toContain("Month End access is unavailable");
  expect(html).toContain("does not have access to an active Month End workspace");
  expect(html).toContain('href="https://endvora.example/">Return to Endvora');
  expect(mocks.createClient).not.toHaveBeenCalled();
});

it("distinguishes a sign-in failure and preserves only safe retry destinations", async () => {
  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({ error: "shared_login", next: "//other.example" }) }));
  expect(html).toContain("Your sign-in could not be completed");
  expect(html).toContain("next=%2Fapp");
  expect(html).not.toContain("other.example");
});

it("omits the return link when the platform origin is not configured safely", async () => {
  mocks.platformHome.mockReturnValue(null);
  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({ error: "workspace_access" }) }));
  expect(html).not.toContain("Return to Endvora");
  expect(html).toContain("Try signing in again");
});
