import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks=vi.hoisted(()=>({claims:vi.fn(),member:vi.fn(),cookie:vi.fn(),update:vi.fn(),complete:vi.fn(),context:vi.fn(),shared:vi.fn()}));
vi.mock("next/headers",()=>({cookies:async()=>({set:mocks.cookie})}));
vi.mock("next/navigation",()=>({redirect:(path:string)=>{throw new Error(`redirect:${path}`);}}));
vi.mock("@/lib/restaurant-os/config",()=>({sharedLoginEnabled:mocks.shared,platformHomeUrl:()=>"https://endvora.com/"}));
vi.mock("@/lib/restaurant-os/selection",()=>({rememberPlatformRestaurant:async()=>{}}));
vi.mock("@/lib/auth/context",()=>({WORKSPACE_COOKIE:"me_workspace",requireAccessContext:mocks.context}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getClaims:mocks.claims,updateUser:mocks.update},rpc:mocks.complete,from:()=>{const builder={select:()=>builder,eq:()=>builder,maybeSingle:mocks.member};return builder;}})}));
import LoginPage from "@/app/login/page";
import { chooseWorkspace } from "@/app/choose-workspace/actions";
import ChangePasswordPage from "@/app/change-password/page";
import { completePasswordSetup } from "@/app/change-password/actions";
const next="/app/team?tab=pending";
const form=()=>{const data=new FormData();data.set("membershipId","member");data.set("next",next);return data;};
beforeEach(()=>{vi.clearAllMocks();mocks.shared.mockReturnValue(true);mocks.claims.mockResolvedValue({data:{claims:{sub:"user"}}});mocks.member.mockResolvedValue({data:{organization_id:"org",organizations:{slug:"kitchen"}}});mocks.context.mockResolvedValue({membershipId:"member",mustChangePassword:true});mocks.update.mockResolvedValue({});mocks.complete.mockResolvedValue({});});
it("keeps bookmark and restaurant in shared-login redirects and retry links",async()=>{
 const query={next,restaurant:"keg"};
 await expect(LoginPage({searchParams:Promise.resolve(query)})).rejects.toThrow(`redirect:/auth/restaurant-os/start?${new URLSearchParams(query)}`);
 const html=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({...query,error:"shared_login"})}));
 expect(html).toContain('href="/month-end/auth/restaurant-os/start?next=%2Fapp%2Fteam%3Ftab%3Dpending&amp;restaurant=keg"');
});
it("keeps the bookmark for already signed-in local-login visitors",async()=>{
 mocks.shared.mockReturnValue(false);await expect(LoginPage({searchParams:Promise.resolve({next})})).rejects.toThrow("redirect:/choose-workspace?next=%2Fapp%2Fteam%3Ftab%3Dpending");
});
it("retains the destination after a validated workspace selection",async()=>{
 await expect(chooseWorkspace(form())).rejects.toThrow(`redirect:${next}`);
 expect(mocks.cookie).toHaveBeenCalledWith("me_workspace","kitchen",expect.objectContaining({httpOnly:true,path:"/month-end"}));
});
it("keeps a rejected workspace choice on the chooser without writing a cookie",async()=>{
 mocks.member.mockResolvedValue({data:null});await expect(chooseWorkspace(form())).rejects.toThrow("redirect:/choose-workspace?error=workspace_access&next=%2Fapp%2Fteam%3Ftab%3Dpending");expect(mocks.cookie).not.toHaveBeenCalled();
});
it("keeps the bookmark if the session expires on workspace submission",async()=>{
 mocks.claims.mockResolvedValue({data:null});await expect(chooseWorkspace(form())).rejects.toThrow("redirect:/login?next=%2Fapp%2Fteam%3Ftab%3Dpending");expect(mocks.cookie).not.toHaveBeenCalled();
});
it("carries the bookmark through required password setup",async()=>{
 mocks.member.mockResolvedValue({data:{organization_id:"org",must_change_password:true,organizations:{slug:"kitchen"}}});
 await expect(chooseWorkspace(form())).rejects.toThrow("redirect:/change-password?next=%2Fapp%2Fteam%3Ftab%3Dpending");
 const html=renderToStaticMarkup(await ChangePasswordPage({searchParams:Promise.resolve({next})}));expect(html).toContain('name="next" value="/app/team?tab=pending"');
 const data=form();data.set("password","Test passphrase 123");data.set("passwordConfirmation","Test passphrase 123");
 await expect(completePasswordSetup(data)).rejects.toThrow(`redirect:${next}`);
 expect(mocks.complete).toHaveBeenCalledWith("complete_first_login",{p_membership_id:"member"});
});
it("preserves the bookmark on password validation failure without changing credentials",async()=>{
 await expect(completePasswordSetup(form())).rejects.toThrow("redirect:/change-password?error=weak_password&next=%2Fapp%2Fteam%3Ftab%3Dpending");expect(mocks.update).not.toHaveBeenCalled();
});
it("rejects malformed and external destinations on workspace submission",async()=>{
 for(const target of ["//evil.example","/\\evil.example","https://evil.example"]){const data=form();data.set("next",target);await expect(chooseWorkspace(data)).rejects.toThrow("redirect:/app");}
});
