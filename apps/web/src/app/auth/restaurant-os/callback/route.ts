import { rememberPlatformRestaurant } from "@/lib/restaurant-os/selection";
import { moduleUrl } from "@/lib/module-path";
import { mappedRestaurant } from "@/lib/restaurant-os/context";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sharedLoginEnabled, appOrigin } from "@/lib/restaurant-os/config";
import { safeNext, loginReturnPath, passwordSetupPath } from "@/lib/restaurant-os/policy";
import { cookies } from "next/headers";
import { WORKSPACE_COOKIE } from "@/lib/auth/context";
export async function GET(request: Request) {
  if (!sharedLoginEnabled()) return new Response("Shared login is not enabled.", { status: 404 });
  const origin = appOrigin();
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"), "/app");
  const platformRestaurant = url.searchParams.get("restaurant");
  const retry = (error: string) => moduleUrl(loginReturnPath(next, error, platformRestaurant), origin);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(retry("shared_login"));
  const client = await createClient();
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(retry("shared_login"));
  const nativeRestaurant = mappedRestaurant(platformRestaurant);
  if (platformRestaurant && !nativeRestaurant) {
    await client.auth.signOut({ scope: "local" });
    return NextResponse.redirect(retry("workspace_access"));
  }
  const { data: memberships, error: membershipError } = await client.from("memberships")
    .select("id, organization_id, must_change_password, organizations(slug)").eq("user_id", data.user.id).eq("status", "active");
  const candidates = nativeRestaurant ? memberships?.filter(member => member.organization_id === nativeRestaurant) : memberships;
  if (membershipError || !candidates?.length) {
    await client.auth.signOut({ scope: "local" });
    return NextResponse.redirect(retry("workspace_access"));
  }
  if (candidates.length > 1) return NextResponse.redirect(moduleUrl(`/choose-workspace?next=${encodeURIComponent(next)}`, origin));
  const membership = candidates[0];
  const org = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;
  if (!org?.slug) {
    await client.auth.signOut({ scope: "local" });
    return NextResponse.redirect(retry("workspace_access"));
  }
  (await cookies()).set(WORKSPACE_COOKIE, org.slug, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/month-end", maxAge: 2592000 });
  await rememberPlatformRestaurant(membership.organization_id);
  if (membership.must_change_password) return NextResponse.redirect(moduleUrl(passwordSetupPath(next), origin));
  const response = NextResponse.redirect(moduleUrl(next, origin));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
