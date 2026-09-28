import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

export async function createClient() {
  return createServerAuthClient();
}

// Recovery must not share its PKCE verifier or session with module OAuth.
export async function createRecoveryClient() {
  return createServerAuthClient("month-end-recovery");
}

async function createServerAuthClient(cookieName?: string) {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookieOptions: { path: "/month-end", ...(cookieName ? { name: cookieName, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" } : {}) },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. The request proxy refreshes them.
        }
      },
    },
  });
}
