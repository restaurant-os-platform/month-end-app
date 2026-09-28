import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sharedLoginEnabled } from "@/lib/restaurant-os/config";
import { LogoutSubmit } from "./submit";
async function logout() {
  "use server";
  await (await createClient()).auth.signOut({ scope: "local" });
  // Fixed deployment configuration, never a user-supplied redirect.
  const next = sharedLoginEnabled() ? process.env.RESTAURANT_OS_LOGOUT_NEXT_URL : undefined;
  redirect(next || "/login");
}
export default function Logout() {
  return <main style={{ padding: 40 }}><h1>Signing out…</h1><LogoutSubmit action={logout} /></main>;
}
