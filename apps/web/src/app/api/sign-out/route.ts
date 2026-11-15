import { moduleUrl } from "@/lib/module-path";
import { sharedLoginEnabled, platformLogoutUrl } from "@/lib/restaurant-os/config";
import { clearModuleSession } from "@/lib/restaurant-os/logout";
import { NextResponse } from "next/server";
export async function POST(request: Request) {
  if (sharedLoginEnabled()) return NextResponse.redirect(platformLogoutUrl(), 303);
  await clearModuleSession();
  return NextResponse.redirect(moduleUrl("/login", request.url), 303);
}
