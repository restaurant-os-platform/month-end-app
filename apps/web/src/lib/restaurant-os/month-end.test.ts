import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ exchange: vi.fn(), signOut: vi.fn(), select: vi.fn(), query: vi.fn(), cookie: vi.fn(), oauth: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { exchangeCodeForSession: mocks.exchange, signOut: mocks.signOut, signInWithOAuth: mocks.oauth }, from: () => ({ select: () => ({ eq: () => ({ eq: mocks.query }) }) }) }) }));
vi.mock("@/lib/restaurant-os/config", () => ({ sharedLoginEnabled: () => true, appOrigin: () => "https://module.example", provider: () => "custom:restaurant-os" }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.cookie }) }));
vi.mock("@/lib/auth/context", () => ({ WORKSPACE_COOKIE: "me_workspace" }));
import { GET } from "@/app/auth/restaurant-os/callback/route";
import { GET as start } from "@/app/auth/restaurant-os/start/route";
import { GET as authorizeBridge } from "@/app/oauth/authorize/route";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("RESTAURANT_OS_RESTAURANT_MAP", JSON.stringify({ keg: "11111111-1111-4111-8111-111111111111" }));
  mocks.exchange.mockResolvedValue({ data: { user: { id: "existing-user" } } });
  mocks.select.mockResolvedValue("selected");
  mocks.query.mockResolvedValue({ data: [{ id: "membership", organizations: { slug: "existing-org" }, must_change_password: false }] });
  mocks.oauth.mockResolvedValue({ data: { url: "https://module.supabase.co/auth/v1/authorize?provider=custom:restaurant-os" } });
});

it("forwards only the authorization request to the configured platform", async () => {
  vi.stubEnv("RESTAURANT_OS_URL", "https://platform.example");
  const response = await authorizeBridge(new Request("https://module.example/oauth/authorize?authorization_id=request-123&next=https://evil.example&code=discard"));
  expect(response.headers.get("location")).toBe("https://platform.example/oauth/authorize?authorization_id=request-123");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("rejects an insecure or looping authorization bridge", async () => {
  for (const origin of ["http://platform.example", "https://module.example", "invalid"]) {
    vi.stubEnv("RESTAURANT_OS_URL", origin);
    expect((await authorizeBridge(new Request("https://module.example/oauth/authorize?authorization_id=request-123"))).status).toBe(503);
  }
});
const request = (next = "/reports?month=9") => new Request(`https://module.example/auth/restaurant-os/callback?code=single-use&next=${encodeURIComponent(next)}`);
it("rejects a missing OAuth code", async () => {
  expect((await GET(new Request("https://module.example/auth/restaurant-os/callback"))).headers.get("location")).toContain("error=shared_login");
  expect(mocks.exchange).not.toHaveBeenCalled();
});
it("rejects invalid or replayed codes", async () => {
  mocks.exchange.mockResolvedValue({ data: {}, error: { message: "invalid" } });
  expect((await GET(request())).headers.get("location")).toContain("error=shared_login");
});
it("preserves permitted deep links after native session exchange", async () => {
  const response = await GET(request());
  expect(response.headers.get("location")).toBe("https://module.example/month-end/reports?month=9");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(mocks.exchange).toHaveBeenCalledWith("single-use");
});
it("rejects external return destinations", async () => {
  expect((await GET(request("//evil.example"))).headers.get("location")).toBe("https://module.example/month-end/app");
});
it("does not grant access to an account without active membership", async () => {
  mocks.select.mockResolvedValue("denied");
  mocks.query.mockResolvedValue({ data: [] });
  expect((await GET(request())).headers.get("location")).toContain("error=workspace_access");
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
});
it("uses provider PKCE and a fixed callback origin", async () => {
  const response = await start(new Request("https://untrusted-host.example/auth/restaurant-os/start?next=//evil.example"));
  expect(response.headers.get("location")).toContain("module.supabase.co/auth/v1/authorize");
  const input = mocks.oauth.mock.calls[0][0];
  expect(input.options.redirectTo).toBe("https://module.example/month-end/auth/restaurant-os/callback?next=%2Fapp");
  expect(input.options.skipBrowserRedirect).toBe(true);
  expect(input.provider).toBe("custom:restaurant-os");
});

it("requires choosing among multiple memberships", async () => {
  mocks.select.mockResolvedValue("choose");
  mocks.query.mockResolvedValue({ data: [{ id: "one" }, { id: "two" }] });
  expect((await GET(request())).headers.get("location")).toContain("choose-workspace?next=");
});

it("preserves mandatory password change", async () => {
  mocks.query.mockResolvedValue({ data: [{ organizations: { slug: "existing-org" }, must_change_password: true }] });
  expect((await GET(request())).headers.get("location")).toBe("https://module.example/month-end/change-password");
});

it("rejects an unmapped restaurant before starting OAuth", async () => {
  const response = await start(new Request("https://module.example/auth/restaurant-os/start?restaurant=not-mapped"));
  expect(response.headers.get("location")).toContain("error=workspace_access");
  expect(mocks.oauth).not.toHaveBeenCalled();
});
it("carries explicit restaurant context through the callback", async () => {
  await start(new Request("https://module.example/auth/restaurant-os/start?restaurant=keg"));
  expect(new URL(mocks.oauth.mock.calls[0][0].options.redirectTo).searchParams.get("restaurant")).toBe("keg");
});
it("rejects a substituted restaurant after login", async () => {
  const response = await GET(new Request("https://module.example/auth/restaurant-os/callback?code=single-use&restaurant=unknown"));
  expect(response.headers.get("location")).toContain("error=workspace_access");
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
});

it("refuses mapped restaurants without a native membership", async () => {
  const response = await GET(new Request("https://module.example/auth/restaurant-os/callback?code=single-use&restaurant=keg"));
  expect(response.headers.get("location")).toContain("error=workspace_access");
  expect(mocks.cookie).not.toHaveBeenCalled();
});
it("selects the requested native organization among multiple memberships", async () => {
  mocks.query.mockResolvedValue({ data: [{ organization_id: "11111111-1111-4111-8111-111111111111", organizations: { slug: "keg" } }, { organization_id: "another", organizations: { slug: "other" } }] });
  const response = await GET(new Request("https://module.example/auth/restaurant-os/callback?code=single-use&restaurant=keg"));
  expect(response.headers.get("location")).toBe("https://module.example/month-end/app");
  expect(mocks.cookie.mock.calls[0][1]).toBe("keg");
});

it("allows the module authorization bridge on the shared Endvora origin", async () => {
  vi.stubEnv("RESTAURANT_OS_URL", "https://endvora.com");
  const response = await authorizeBridge(new Request("https://endvora.com/month-end/oauth/authorize?authorization_id=request-123"));
  expect(response.headers.get("location")).toBe("https://endvora.com/oauth/authorize?authorization_id=request-123");
});

it("remembers the canonical restaurant only after native membership selection", async () => {
  mocks.query.mockResolvedValue({ data: [{ organization_id: "11111111-1111-4111-8111-111111111111", organizations: { slug: "keg" } }] });
  await GET(new Request("https://module.example/auth/restaurant-os/callback?code=single-use&restaurant=keg"));
  expect(mocks.cookie).toHaveBeenCalledWith("restaurant-os-restaurant", "keg", expect.objectContaining({ path: "/", httpOnly: true }));
});
