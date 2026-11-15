import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** Clear only this module's browser credentials and selected workspace. */
export async function clearModuleSession() {
  try { await (await createClient()).auth.signOut({ scope: "local" }); }
  catch { /* Cookie removal still completes when the auth service is unavailable. */ }
  const store = await cookies();
  const prefixes = ["month-end-recovery"];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) prefixes.push(`sb-${new URL(url).hostname.split(".")[0]}-auth-token`);
  for (const { name } of store.getAll()) {
    if (prefixes.some(prefix => name === prefix || name.startsWith(`${prefix}.`) || name.startsWith(`${prefix}-`))) {
      store.set(name, "", { path: "/month-end", maxAge: 0, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    }
  }
  store.set("me_workspace", "", { path: "/month-end", maxAge: 0, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}
