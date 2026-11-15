import { beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({claims:vi.fn(),members:vi.fn(),cookie:vi.fn(),path:vi.fn()}));
vi.mock("next/headers",()=>({cookies:async()=>({get:mocks.cookie}),headers:async()=>({get:mocks.path})}));
vi.mock("next/navigation",()=>({redirect:(url:string)=>{throw new Error(`redirect:${url}`);}}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getClaims:mocks.claims},from:(name:string)=>{const builder={select:()=>builder,eq:()=>builder,limit:()=>builder,maybeSingle:async()=>({data:{}}),then:(resolve:(value:unknown)=>void)=>resolve(name==="memberships"?mocks.members():{data:[]})};return builder;},rpc:async()=>({data:[{permission_keys:["counts.create"]}]})})}));
import { requireAccessContext } from "./context";
beforeEach(()=>{vi.clearAllMocks();mocks.path.mockReturnValue("/app/team?tab=pending");mocks.claims.mockResolvedValue({data:{claims:{sub:"user",email:"user@example.invalid"}}});mocks.members.mockReturnValue({data:[]});});
it("preserves path and query when an unauthenticated bookmark requires login",async()=>{
 mocks.claims.mockResolvedValue({data:null});await expect(requireAccessContext()).rejects.toThrow("redirect:/login?next=%2Fapp%2Fteam%3Ftab%3Dpending");expect(mocks.members).not.toHaveBeenCalled();
});
it("preserves a signed-in bookmark when workspace selection is needed",async()=>{
 await expect(requireAccessContext()).rejects.toThrow("redirect:/choose-workspace?next=%2Fapp%2Fteam%3Ftab%3Dpending");
});
it("keeps required password setup ahead of the bookmarked page",async()=>{
 mocks.members.mockReturnValue({data:[{id:"membership",organization_id:"org",role:"staff",must_change_password:true,organizations:{name:"Kitchen",slug:"kitchen"}}]});
 await expect(requireAccessContext()).rejects.toThrow("redirect:/change-password?next=%2Fapp%2Fteam%3Ftab%3Dpending");
 await expect(requireAccessContext({allowPasswordChange:true})).resolves.toMatchObject({organizationId:"org",mustChangePassword:true,permissionKeys:["counts.create"]});
});
it("never selects another workspace from a forged cookie",async()=>{
 mocks.cookie.mockReturnValue({value:"unassigned"});mocks.members.mockReturnValue({data:[{id:"membership",organizations:{name:"Kitchen",slug:"kitchen"}}]});
 await expect(requireAccessContext()).rejects.toThrow("redirect:/choose-workspace?next=");
});
it("rejects an external request destination",async()=>{
 mocks.path.mockReturnValue("//evil.example");await expect(requireAccessContext()).rejects.toThrow("redirect:/choose-workspace?next=%2Fapp");
});
