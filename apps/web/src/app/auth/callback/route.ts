import { getPublicAppUrl } from "@/lib/auth/public-url";
import { moduleUrl } from "@/lib/module-path";
import { NextResponse } from "next/server";

import { createClient, createRecoveryClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/restaurant-os/policy";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  const next = safeNext(requestedNext, "/app");
  const recovery = next === "/reset-password";

  if (code) {
    const supabase = await (recovery ? createRecoveryClient() : createClient());
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(moduleUrl(next, getPublicAppUrl()), { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  }

  return NextResponse.redirect(moduleUrl(recovery ? "/forgot-password?error=expired_link" : "/login?error=confirmation_failed", getPublicAppUrl()));
}
