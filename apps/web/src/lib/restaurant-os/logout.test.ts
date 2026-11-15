import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({signOut:vi.fn(),set:vi.fn(),shared:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{signOut:mocks.signOut}})}));
vi.mock("@/lib/restaurant-os/config",()=>({sharedLoginEnabled:mocks.shared,platformLogoutUrl:()=>"https://endvora.com/logout"}));
vi.mock("next/headers",()=>({cookies:async()=>({getAll:()=>[{name:"sb-project-auth-token.0"},{name:"sb-project-auth-token-code-verifier"},{name:"month-end-recovery.0"},{name:"restaurant-os-auth"},{name:"sb-other-auth-token"},{name:"theme"}],set:mocks.set})}));
vi.mock("next/navigation",()=>({redirect:(url:string)=>{throw new Error(`redirect:${url}`);}}));
import { clearModuleSession } from "@/lib/restaurant-os/logout";
import { logout } from "@/app/auth/restaurant-os/logout/actions";
import { GET } from "@/app/auth/restaurant-os/sign-out/route";
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://project.supabase.co");mocks.shared.mockReturnValue(true);mocks.signOut.mockResolvedValue({});});
afterEach(()=>vi.unstubAllEnvs());
it("clears only this module's session, verifier, secondary session and restaurant selection",async()=>{
 await clearModuleSession();expect(mocks.signOut).toHaveBeenCalledWith({scope:"local"});
 expect(mocks.set.mock.calls.map(call=>call[0])).toEqual(["sb-project-auth-token.0","sb-project-auth-token-code-verifier","month-end-recovery.0","me_workspace"]);
 for(const call of mocks.set.mock.calls)expect(call[2]).toMatchObject({path:"/month-end",maxAge:0,httpOnly:true});
});
it("continues the fixed shared chain after clearing module cookies",async()=>{
 await expect(logout()).rejects.toThrow("redirect:https://endvora.com/tip-pool/auth/restaurant-os/logout");
 expect(mocks.set).toHaveBeenCalledWith("me_workspace","",expect.objectContaining({path:"/month-end",maxAge:0}));
});
it("shows shared confirmation before mutating any session and ignores supplied redirect targets",async()=>{
 const response=await GET(new Request("https://endvora.com/month-end/auth/restaurant-os/sign-out?next=https://evil.example"));
 expect(response.headers.get("location")).toBe("https://endvora.com/logout");expect(mocks.signOut).not.toHaveBeenCalled();expect(mocks.set).not.toHaveBeenCalled();
});
it("routes standalone entry to local session cleanup",async()=>{
 mocks.shared.mockReturnValue(false);expect((await GET(new Request("https://endvora.com/month-end/auth/restaurant-os/sign-out"))).headers.get("location")).toBe("https://endvora.com/month-end/auth/restaurant-os/logout");
 await expect(logout()).rejects.toThrow("redirect:/login");
});
it("still clears browser credentials when the auth service is unavailable",async()=>{
 mocks.signOut.mockRejectedValue(new Error("offline"));await clearModuleSession();expect(mocks.set).toHaveBeenCalledWith("sb-project-auth-token.0","",expect.objectContaining({maxAge:0}));
});

import { POST } from "@/app/api/sign-out/route";
import { signOut } from "@/app/app/actions";
it("keeps native forms and the legacy POST on the same confirmation without partial logout",async()=>{
 expect((await POST(new Request("https://endvora.com/month-end/api/sign-out",{method:"POST"}))).headers.get("location")).toBe("https://endvora.com/logout");
 await expect(signOut()).rejects.toThrow("redirect:https://endvora.com/logout");expect(mocks.signOut).not.toHaveBeenCalled();
});
it("clears the native standalone session before returning to module login",async()=>{
 mocks.shared.mockReturnValue(false);const response=await POST(new Request("https://endvora.com/month-end/api/sign-out",{method:"POST"}));
 expect(response.status).toBe(303);expect(response.headers.get("location")).toBe("https://endvora.com/month-end/login");expect(mocks.signOut).toHaveBeenCalledWith({scope:"local"});
});
