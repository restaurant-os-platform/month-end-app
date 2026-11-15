"use server";
import { redirect } from "next/navigation";
import { clearModuleSession } from "@/lib/restaurant-os/logout";
import { sharedLoginEnabled, platformLogoutUrl } from "@/lib/restaurant-os/config";

export async function logout() {
  await clearModuleSession();
  // Fixed chain: never accept a destination from request parameters.
  redirect(sharedLoginEnabled() ? new URL("/tip-pool/auth/restaurant-os/logout", platformLogoutUrl()).toString() : "/login");
}
