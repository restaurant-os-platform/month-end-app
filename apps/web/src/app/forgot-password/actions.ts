"use server";

import { redirect } from "next/navigation";

import { createRecoveryClient } from "@/lib/supabase/server";
import { getPublicAppUrl } from "@/lib/auth/public-url";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) redirect("/forgot-password?error=invalid_email");

  const appUrl = getPublicAppUrl();
  const supabase = await createRecoveryClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
  });
  if (error) redirect("/forgot-password?error=send_failed");
  redirect("/forgot-password?sent=1");
}
