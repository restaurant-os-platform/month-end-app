import { requestDestination } from "@/lib/restaurant-os/return-path";
import { loginReturnPath, passwordSetupPath } from "@/lib/restaurant-os/policy";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export type AccessContext = {
  userId: string;
  membershipId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: "owner" | "admin" | "manager" | "staff";
  jobTitle: string;
  mustChangePassword: boolean;
  displayName: string;
  email: string;
  locationIds: string[];
  positionIds: string[];
  departmentIds: string[];
  permissionKeys: string[];
  canManagePeople: boolean;
  canManagePositions: boolean;
};

export const WORKSPACE_COOKIE = "me_workspace";

export function normalizeWorkspace(value: string) {
  return value.trim().toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function workspaceMatches(identifier: string, organization: { name: string; slug: string }) {
  const wanted = normalizeWorkspace(identifier);
  const name = normalizeWorkspace(organization.name);
  const slug = normalizeWorkspace(organization.slug);
  if (!wanted) return false;
  if (wanted === name || wanted === slug) return true;
  const wantedWords = wanted.split("-").filter((word) => word.length > 2 && !["the", "restaurant"].includes(word));
  const organizationWords = new Set(`${name}-${slug}`.split("-"));
  return wantedWords.length > 0 && wantedWords.every((word) => organizationWords.has(word));
}

async function getWorkspaceMembership() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const cookieStore = await cookies();
  const selectedWorkspace = cookieStore.get(WORKSPACE_COOKIE)?.value ?? "";
  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, organization_id, role, job_title, must_change_password, organizations(name, slug)")
    .eq("user_id", userId)
    .eq("status", "active");

  const candidates = (memberships ?? []).map((membership) => {
    const organization = Array.isArray(membership.organizations)
      ? membership.organizations[0]
      : membership.organizations;
    return { membership, organization };
  }).filter((item) => item.organization);
  const selected = selectedWorkspace
    ? candidates.find((item) => workspaceMatches(selectedWorkspace, item.organization!))
    : candidates.length === 1 ? candidates[0] : null;
  const membership = selected?.membership;

  if (!membership) return null;
  return { supabase, userId, claimsData, selected, membership };
}

// Room reservations need current membership and counting permission, not profile
// details or the management controls used by the full workspace shell.
export async function getCountRoomContext() {
  const workspace = await getWorkspaceMembership();
  if (!workspace) return null;
  const { supabase, userId, membership } = workspace;
  const privileged = membership.role === "owner" || membership.role === "admin";
  const { data, error } = privileged
    ? { data: null, error: null }
    : await supabase.rpc("get_my_effective_access", { p_organization_id: membership.organization_id });
  if (error) throw new Error("Counting permissions could not be loaded.");
  return {
    userId,
    organizationId: membership.organization_id,
    canCount: privileged || Boolean(data?.[0]?.permission_keys?.includes("counts.create")),
    supabase,
  };
}

export async function getAccessContext(): Promise<AccessContext | null> {
  const workspace = await getWorkspaceMembership();
  if (!workspace) return null;
  const { supabase, userId, claimsData, selected, membership } = workspace;
  const [{ data: profile }, { data: effectiveRows }, { data: locationAuthority }, { data: regionAuthority }] = await Promise.all([
    supabase.from("profiles").select("display_name, email").eq("id", userId).maybeSingle(),
    supabase.rpc("get_my_effective_access", { p_organization_id: membership.organization_id }),
    supabase.from("membership_location_assignments").select("authority").eq("membership_id", membership.id).eq("authority", "location_admin").limit(1),
    supabase.from("membership_region_assignments").select("is_manager").eq("membership_id", membership.id).eq("is_manager", true).limit(1),
  ]);
  const effective = effectiveRows?.[0];

  const organization = selected?.organization;
  const claimEmail = typeof claimsData.claims.email === "string" ? claimsData.claims.email : "";

  return {
    userId,
    membershipId: membership.id,
    organizationId: membership.organization_id,
    organizationName: organization?.name ?? "Workspace",
    organizationSlug: organization?.slug ?? "workspace",
    role: membership.role as AccessContext["role"],
    jobTitle: membership.job_title || membership.role,
    mustChangePassword: membership.must_change_password,
    displayName: profile?.display_name || claimEmail.split("@")[0] || "Team member",
    email: profile?.email || claimEmail,
    locationIds: effective?.location_ids ?? [],
    positionIds: effective?.position_ids ?? [],
    departmentIds: effective?.department_ids ?? [],
    permissionKeys: effective?.permission_keys ?? [],
    canManagePeople: effective?.can_manage_people ?? ["owner", "admin"].includes(membership.role),
    canManagePositions: ["owner", "admin"].includes(membership.role) || Boolean(locationAuthority?.length || regionAuthority?.length),
  };
}

export async function requireAccessContext(options: { allowPasswordChange?: boolean } = {}) {
  const context = await getAccessContext();
  if (!context) {
    const next = await requestDestination();
    const { data } = await (await createClient()).auth.getClaims();
    redirect(data?.claims?.sub ? `/choose-workspace?next=${encodeURIComponent(next)}` : loginReturnPath(next));
  }
  if (context.mustChangePassword && !options.allowPasswordChange) redirect(passwordSetupPath(await requestDestination()));
  return context;
}

export function can(context: AccessContext, permission: string) {
  return context.role === "owner"
    || context.role === "admin"
    || context.permissionKeys.includes(permission);
}
