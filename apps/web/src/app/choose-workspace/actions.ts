"use server";

import { safeNext, loginReturnPath, passwordSetupPath } from "@/lib/restaurant-os/policy";
import { rememberPlatformRestaurant } from "@/lib/restaurant-os/selection";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { WORKSPACE_COOKIE } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export async function chooseWorkspace(formData: FormData) {
  const membershipId = String(formData.get("membershipId") ?? "");
  const next = safeNext(formData.get("next"), "/app");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect(loginReturnPath(next));

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, organization_id, must_change_password, organizations(slug)")
    .eq("id", membershipId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const organization = Array.isArray(membership?.organizations)
    ? membership.organizations[0]
    : membership?.organizations;
  if (!membership || !organization?.slug) redirect(`/choose-workspace?error=workspace_access&next=${encodeURIComponent(next)}`);

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, organization.slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/month-end",
    maxAge: 60 * 60 * 24 * 365,
  });

  await rememberPlatformRestaurant(membership.organization_id);

  if (membership.must_change_password) redirect(passwordSetupPath(next));
  redirect(next);
}
