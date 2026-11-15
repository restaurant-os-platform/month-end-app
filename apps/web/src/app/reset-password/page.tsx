import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_REQUIREMENT, PASSWORD_MISMATCH, PASSWORD_SAVE_FAILED } from "@/lib/auth/password";
import Link from "next/link";
import { accountSignInHref } from "@/lib/restaurant-os/account-help";
import type { Metadata } from "next";

import { updatePassword } from "./actions";

export const metadata: Metadata = { title: "Choose a new password" };

const messages: Record<string, string> = {
  weak_password: PASSWORD_REQUIREMENT,
  password_mismatch: PASSWORD_MISMATCH,
  update_failed: PASSWORD_SAVE_FAILED,
};

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <main className="setup-page"><section className="setup-card activation-card">
    <span className="brand-mark" aria-hidden="true">ME</span><p className="eyebrow">Account recovery</p><h1>Choose a new password.</h1><p>Use a unique password that you do not use for another service.</p>
    {params.error ? <div className="form-alert" role="alert">{messages[params.error] ?? messages.update_failed}</div> : null}
    <form action={updatePassword} className="auth-form activation-form"><label><span>New password</span><small>{PASSWORD_REQUIREMENT}</small><input name="password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} required /></label><label><span>Confirm new password</span><input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} required /></label><button type="submit">Update password</button></form>
    <Link className="secondary-link" href="/forgot-password">Request a new reset link</Link>
    <a className="secondary-link" href={accountSignInHref()}>Back to sign in</a>
  </section></main>;
}
