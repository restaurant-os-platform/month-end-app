import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("./env",()=>({getSupabaseEnv:()=>({url:"https://example.supabase.co",publishableKey:"test-key"})}));
vi.mock("@supabase/ssr",()=>({createServerClient:(_url:unknown,_key:unknown,options:{cookies:{setAll:(values:unknown[],headers:Record<string,string>)=>void}})=>({auth:{getClaims:async()=>{options.cookies.setAll([{name:"refreshed",value:"yes",options:{path:"/month-end"}}],{"Cache-Control":"private, no-store"});return {data:null};}}})}));
import { updateSession } from "./proxy";
it("overwrites caller-supplied return paths and retains refreshed session cookies",async()=>{
 const request=new NextRequest("https://endvora.com/month-end/app/team?tab=pending",{nextConfig:{basePath:"/month-end"},headers:{"x-month-end-return-path":"//evil.example"}});
 const response=await updateSession(request);
 expect(response.headers.get("x-middleware-request-x-month-end-return-path")).toBe("/app/team?tab=pending");
 expect(response.headers.get("x-middleware-request-cookie")).toContain("refreshed=yes");
 expect(response.cookies.get("refreshed")?.value).toBe("yes");expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
