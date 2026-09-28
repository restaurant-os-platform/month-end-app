"use server";

import { redirect } from "next/navigation";

import { createRecoveryClient } from "@/lib/supabase/server";
import { sharedLoginEnabled } from "@/lib/restaurant-os/config";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");
  if (password.length < 6 || !/[a-z]/.test(password) || !/[0-9]/.test(password)) redirect("/reset-password?error=weak_password");
  if (password !== confirmation) redirect("/reset-password?error=password_mismatch");

  const supabase = await createRecoveryClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=expired_link");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/reset-password?error=update_failed");
  await supabase.auth.signOut({ scope: "local" });
  if (sharedLoginEnabled() && process.env.RESTAURANT_OS_URL) redirect(new URL("/login", process.env.RESTAURANT_OS_URL).toString());
  redirect("/login?reset=1");
}
