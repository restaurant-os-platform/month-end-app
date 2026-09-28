import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ normal: vi.fn(), recovery: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/restaurant-os/config", () => ({ sharedLoginEnabled: () => false }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession: mocks.normal } }),
  createRecoveryClient: async () => ({ auth: { exchangeCodeForSession: mocks.recovery, getUser: mocks.getUser, updateUser: mocks.updateUser, signOut: mocks.signOut } }),
}));
import { GET } from "@/app/auth/callback/route";
import { updatePassword } from "@/app/reset-password/actions";
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("PUBLIC_APP_URL", "https://endvora.com/month-end"); mocks.normal.mockResolvedValue({ error: null }); mocks.recovery.mockResolvedValue({ error: null }); });
it("exchanges reset codes only using the isolated recovery session", async () => {
  const response = await GET(new Request("https://month.example/auth/callback?code=reset-code&next=/reset-password"));
  expect(mocks.recovery).toHaveBeenCalledWith("reset-code");
  expect(mocks.normal).not.toHaveBeenCalled();
  expect(response.headers.get("location")).toBe("https://endvora.com/month-end/reset-password");
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("sends failed reset exchanges to recovery instead of an OAuth login loop", async () => {
  mocks.recovery.mockResolvedValue({ error: { message: "code verifier mismatch" } });
  const response = await GET(new Request("https://month.example/auth/callback?code=old-code&next=/reset-password"));
  expect(response.headers.get("location")).toBe("https://endvora.com/month-end/forgot-password?error=expired_link");
});
it("retains the normal session for non-recovery confirmations", async () => {
  await GET(new Request("https://month.example/auth/callback?code=confirmation&next=/app"));
  expect(mocks.normal).toHaveBeenCalledWith("confirmation");
  expect(mocks.recovery).not.toHaveBeenCalled();
});
it("rejects external confirmation destinations", async () => {
  const response = await GET(new Request("https://month.example/auth/callback?code=confirmation&next=//evil.example"));
  expect(response.headers.get("location")).toBe("https://endvora.com/month-end/app");
});
it("accepts six characters with lowercase and a number without uppercase or symbols", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "recovery-user" } } });
  mocks.updateUser.mockResolvedValue({ error: null });
  const form = new FormData();
  form.set("password", "abc123"); form.set("passwordConfirmation", "abc123");
  await expect(updatePassword(form)).rejects.toThrow(); // Next.js redirect after success.
  expect(mocks.updateUser).toHaveBeenCalledWith({ password: "abc123" });
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
});
it.each(["abc12", "abcdef", "123456", "ABC123"])("rejects a password missing the remaining requirements: %s", async password => {
  const form = new FormData();
  form.set("password", password); form.set("passwordConfirmation", password);
  await expect(updatePassword(form)).rejects.toThrow();
  expect(mocks.updateUser).not.toHaveBeenCalled();
});
