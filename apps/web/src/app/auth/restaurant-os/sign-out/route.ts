import { NextResponse } from "next/server";
import { moduleUrl } from "@/lib/module-path";
import { sharedLoginEnabled, platformLogoutUrl } from "@/lib/restaurant-os/config";
export async function GET(request: Request) {
  return NextResponse.redirect(sharedLoginEnabled() ? platformLogoutUrl() : moduleUrl("/auth/restaurant-os/logout", request.url));
}
