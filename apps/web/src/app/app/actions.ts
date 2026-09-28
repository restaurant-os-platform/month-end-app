"use server";
import { sharedLoginEnabled, platformLogoutUrl } from "@/lib/restaurant-os/config";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(sharedLoginEnabled() ? platformLogoutUrl() : "/login");
}
