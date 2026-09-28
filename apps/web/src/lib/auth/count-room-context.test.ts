import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ claims: vi.fn(), from: vi.fn(), rpc: vi.fn(), cookie: vi.fn(), membership: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookie }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getClaims: mocks.claims }, from: mocks.from, rpc: mocks.rpc }) }));
import { getCountRoomContext } from "./context";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.claims.mockResolvedValue({ data: { claims: { sub: "user" } } });
  mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ eq: mocks.membership }) }) });
  mocks.membership.mockResolvedValue({ data: [{ id: "membership", organization_id: "org", role: "staff", organizations: { name: "Restaurant", slug: "restaurant" } }] });
  mocks.rpc.mockResolvedValue({ data: [{ permission_keys: ["counts.create"] }] });
});
it("denies requests without a verified identity", async () => {
  mocks.claims.mockResolvedValue({ data: null });
  expect(await getCountRoomContext()).toBeNull();
  expect(mocks.from).not.toHaveBeenCalled();
});
it("uses fresh counting permissions without loading profile or management data", async () => {
  expect(await getCountRoomContext()).toMatchObject({ userId: "user", organizationId: "org", canCount: true });
  expect(mocks.from.mock.calls).toEqual([["memberships"]]);
  expect(mocks.rpc).toHaveBeenCalledWith("get_my_effective_access", { p_organization_id: "org" });
});
it("denies staff without counting permission", async () => {
  mocks.rpc.mockResolvedValue({ data: [{ permission_keys: [] }] });
  expect(await getCountRoomContext()).toMatchObject({ canCount: false });
});
it("does not fall back to another restaurant when the selection is invalid", async () => {
  mocks.cookie.mockReturnValue({ value: "another-restaurant" });
  expect(await getCountRoomContext()).toBeNull();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("preserves owner access with only the membership lookup", async () => {
  mocks.membership.mockResolvedValue({ data: [{ id: "membership", organization_id: "org", role: "owner", organizations: { name: "Restaurant", slug: "restaurant" } }] });
  expect(await getCountRoomContext()).toMatchObject({ canCount: true });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("fails closed when permission loading fails", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { message: "unavailable" } });
  await expect(getCountRoomContext()).rejects.toThrow("Counting permissions could not be loaded");
});
