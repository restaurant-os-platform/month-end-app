"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { sharedLoginEnabled } from "@/lib/restaurant-os/config";
import { safeNext } from "@/lib/restaurant-os/policy";

import { WORKSPACE_COOKIE } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const next = safeNext(formData.get("next"), "/app");
  if (sharedLoginEnabled()) redirect(`/auth/restaurant-os/start?next=${encodeURIComponent(next)}`);

  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/login?error=invalid_form");
  }

  const supabase = await createClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    redirect("/login?error=invalid_credentials");
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("memberships")
    .select("id, must_change_password, status, organizations(name, slug)")
    .eq("user_id", signInData.user.id)
    .eq("status", "active");

  if (membershipError || !memberships?.length) {
    await supabase.auth.signOut();
    redirect("/login?error=workspace_access");
  }

  if (memberships.length > 1) redirect(`/choose-workspace?next=${encodeURIComponent(next)}`);

  const membership = memberships[0];
  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;
  if (!organization?.slug) {
    await supabase.auth.signOut();
    redirect("/login?error=workspace_access");
  }

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, organization.slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/month-end",
    maxAge: 60 * 60 * 24 * 365,
  });

  if (membership.must_change_password) redirect("/change-password");

  redirect(next);
}
