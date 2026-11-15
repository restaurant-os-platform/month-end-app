"use server";

import { moduleUrl } from "@/lib/module-path";
import { redirect } from "next/navigation";

import { createRecoveryClient } from "@/lib/supabase/server";
import { getPublicAppUrl } from "@/lib/auth/public-url";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/forgot-password?error=invalid_email");

  const appUrl = getPublicAppUrl();
  const supabase = await createRecoveryClient();
  const callback = moduleUrl("/auth/callback", appUrl);
  callback.searchParams.set("next", "/reset-password");
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback.toString() });
  if (error) redirect(`/forgot-password?error=${error.status === 429 ? "rate_limited" : "send_failed"}`);
  redirect("/forgot-password?sent=1");
}
