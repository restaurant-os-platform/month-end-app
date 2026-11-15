"use server";

import { validNewPassword } from "@/lib/auth/password";

import { safeNext, passwordSetupPath } from "@/lib/restaurant-os/policy";
import { redirect } from "next/navigation";

import { requireAccessContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export async function completePasswordSetup(formData: FormData) {
  const context = await requireAccessContext({ allowPasswordChange: true });
  const next = safeNext(formData.get("next"), "/app");
  const password = formData.get("password");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");
  if (!validNewPassword(password)) redirect(passwordSetupPath(next, "weak_password"));
  if (password !== confirmation) redirect(passwordSetupPath(next, "password_mismatch"));

  const supabase = await createClient();
  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) redirect(passwordSetupPath(next, "update_failed"));
  const { error: membershipError } = await supabase.rpc("complete_first_login", { p_membership_id: context.membershipId });
  if (membershipError) redirect(passwordSetupPath(next, "update_failed"));
  redirect(next);
}
