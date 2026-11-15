"use server";
import { redirect } from "next/navigation";
import { sharedLoginEnabled, platformLogoutUrl } from "@/lib/restaurant-os/config";
import { clearModuleSession } from "@/lib/restaurant-os/logout";
export async function signOut() {
  if (sharedLoginEnabled()) redirect(platformLogoutUrl());
  await clearModuleSession();
  redirect("/login");
}
