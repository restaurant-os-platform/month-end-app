import { moduleUrl } from "@/lib/module-path";
import { mappedRestaurant } from "@/lib/restaurant-os/context";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sharedLoginEnabled, appOrigin, provider } from "@/lib/restaurant-os/config";
import { safeNext, loginReturnPath } from "@/lib/restaurant-os/policy";
export async function GET(request: Request) {
  if (!sharedLoginEnabled()) return NextResponse.redirect(moduleUrl("/login", request.url));
  const origin = appOrigin();
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"), "/app");
  const restaurant = url.searchParams.get("restaurant");
  const retry = (error: string) => moduleUrl(loginReturnPath(next, error, restaurant), origin);
  const callback = moduleUrl("/auth/restaurant-os/callback", origin);
  callback.searchParams.set("next", next);
  if (restaurant) {
    if (!mappedRestaurant(restaurant)) return NextResponse.redirect(retry("workspace_access"));
    callback.searchParams.set("restaurant", restaurant);
  }
  const client = await createClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: provider(),
    options: { redirectTo: callback.toString(), scopes: "openid email profile", skipBrowserRedirect: true },
  });
  if (error || !data.url) return NextResponse.redirect(retry("shared_login"));
  const response = NextResponse.redirect(data.url);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
