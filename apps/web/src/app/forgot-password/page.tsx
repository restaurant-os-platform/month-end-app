import { accountSignInHref } from "@/lib/restaurant-os/account-help";
import { sharedLoginEnabled } from "@/lib/restaurant-os/config";
import type { Metadata } from "next";

import { requestPasswordReset } from "./actions";

export const metadata: Metadata = { title: "Reset password" };
const errors: Record<string, string> = {
  rate_limited: "Too many requests. Wait a few minutes before requesting another link.",
  invalid_email: "Enter a valid email address.",
  send_failed: "The reset email could not be sent. Please wait a few minutes and try again.",
  expired_link: "This reset link could not be verified. Request a new link here, then open the newest email in this same browser.",
};

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const params = await searchParams;
  const signIn = accountSignInHref();
  return <main className="setup-page"><section className="setup-card activation-card">
    <span className="brand-mark" aria-hidden="true">ME</span>
    {params.sent ? <><p className="eyebrow">Email sent</p><h1>Check your inbox.</h1><p>If an account exists for that address, a secure password-reset link is on its way. Open the newest email link in this same browser. Use the newest link you requested.</p><a className="secondary-link" href={signIn}>Back to sign in</a></> : <>
      <p className="eyebrow">Account recovery</p><h1>Reset your password.</h1><p>{sharedLoginEnabled() ? "Enter the email address you use for Endvora, Tip Pool, and Month’s End." : "Enter the email address you use for Month’s End."}</p>
      {params.error ? <div className="form-alert" role="alert">{errors[params.error] ?? "Please try again."}</div> : null}
      <form action={requestPasswordReset} className="auth-form activation-form"><label><span>Email address</span><input name="email" type="email" autoComplete="email" required /></label><button type="submit">Send reset link</button></form>
      <a className="secondary-link" href={signIn}>Back to sign in</a>
    </>}
  </section></main>;
}
