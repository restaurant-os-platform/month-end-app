"use server";

import { validNewPassword } from "@/lib/auth/password";

import { redirect } from "next/navigation";

import { createRecoveryClient } from "@/lib/supabase/server";
import { accountSignInDestination } from "@/lib/restaurant-os/account-help";

export async function updatePassword(formData: FormData) {
  const password = formData.get("password");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");
  if (!validNewPassword(password)) redirect("/reset-password?error=weak_password");
  if (password !== confirmation) redirect("/reset-password?error=password_mismatch");

  const supabase = await createRecoveryClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=expired_link");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/reset-password?error=update_failed");
  await supabase.auth.signOut({ scope: "local" });
  redirect(`${accountSignInDestination()}?reset=1`);
}
