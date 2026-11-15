import { safeNext } from "@/lib/restaurant-os/policy";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireAccessContext } from "@/lib/auth/context";
import { completePasswordSetup } from "./actions";

export const metadata: Metadata = { title: "Set your password" };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  weak_password: "Use at least 6 characters, including a lowercase letter and a number.",
  password_mismatch: "The passwords do not match.",
  update_failed: "Your password could not be updated. Please try again.",
};

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const context = await requireAccessContext({ allowPasswordChange: true });
  const params = await searchParams;
  const target = safeNext(params.next, "/app");
  const next = /^\/(month-end\/)?change-password(?:[?#]|$)/.test(target) ? "/app" : target;
  if (!context.mustChangePassword) redirect(next);
  return <main className="setup-page"><section className="setup-card password-setup-card">
    <span className="brand-mark" aria-hidden="true">ME</span>
    <p className="eyebrow">First sign in</p>
    <h1>Create your private password.</h1>
    <p>{context.displayName}, replace the temporary password before opening {context.organizationName}.</p>
    {params.error ? <div className="form-alert" role="alert">{errors[params.error] ?? errors.update_failed}</div> : null}
    <form action={completePasswordSetup} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <label><span>New password</span><input name="password" type="password" autoComplete="new-password" minLength={6} required /></label>
      <label><span>Confirm password</span><input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={6} required /></label>
      <button type="submit">Save password and continue</button>
    </form>
  </section></main>;
}
