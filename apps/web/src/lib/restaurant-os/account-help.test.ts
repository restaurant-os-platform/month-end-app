import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks=vi.hoisted(()=>({shared:vi.fn(),home:vi.fn(),reset:vi.fn(),user:vi.fn(),update:vi.fn(),signOut:vi.fn()}));
vi.mock("@/lib/restaurant-os/config",()=>({sharedLoginEnabled:mocks.shared,platformHomeUrl:mocks.home}));
vi.mock("@/lib/auth/public-url",()=>({getPublicAppUrl:()=>"https://endvora.com/month-end"}));
vi.mock("@/lib/supabase/server",()=>({createRecoveryClient:async()=>({auth:{resetPasswordForEmail:mocks.reset,getUser:mocks.user,updateUser:mocks.update,signOut:mocks.signOut}})}));
vi.mock("next/navigation",()=>({redirect:(url:string)=>{throw new Error(`redirect:${url}`);}}));
import { accountSignInDestination, accountSignInHref } from "./account-help";
import { requestPasswordReset } from "@/app/forgot-password/actions";
import { updatePassword } from "@/app/reset-password/actions";
import ForgotPasswordPage from "@/app/forgot-password/page";
import ResetPasswordPage from "@/app/reset-password/page";
beforeEach(()=>{vi.clearAllMocks();mocks.shared.mockReturnValue(true);mocks.home.mockReturnValue("https://endvora.com/");mocks.reset.mockResolvedValue({});mocks.user.mockResolvedValue({data:{user:{id:"recovery-user"}}});mocks.update.mockResolvedValue({});mocks.signOut.mockResolvedValue({});});
const passwordForm=(password="long passphrase 123")=>{const form=new FormData();form.set("password",password);form.set("passwordConfirmation",password);return form;};
it("returns shared users to platform sign-in and standalone users to module sign-in",()=>{
 expect(accountSignInHref()).toBe("https://endvora.com/login");mocks.shared.mockReturnValue(false);
 expect(accountSignInHref()).toBe("/month-end/login");expect(accountSignInDestination()).toBe("/login");
});
it("uses the fixed module callback and isolated recovery client",async()=>{
 const form=new FormData();form.set("email"," Person@Example.test ");
 await expect(requestPasswordReset(form)).rejects.toThrow("redirect:/forgot-password?sent=1");
 expect(mocks.reset).toHaveBeenCalledWith("person@example.test",{redirectTo:"https://endvora.com/month-end/auth/callback?next=%2Freset-password"});
});
it("does not attempt to email invalid addresses",async()=>{
 for(const email of ["missing","a@","a b@example.test"]){const form=new FormData();form.set("email",email);await expect(requestPasswordReset(form)).rejects.toThrow("redirect:/forgot-password?error=invalid_email");}
 expect(mocks.reset).not.toHaveBeenCalled();
});
it("offers a clear retry message for rate limits",async()=>{
 mocks.reset.mockResolvedValue({error:{status:429}});const form=new FormData();form.set("email","person@example.test");
 await expect(requestPasswordReset(form)).rejects.toThrow("redirect:/forgot-password?error=rate_limited");
});
it("never updates a password without a verified recovery session",async()=>{
 mocks.user.mockResolvedValue({data:{user:null}});await expect(updatePassword(passwordForm())).rejects.toThrow("redirect:/forgot-password?error=expired_link");expect(mocks.update).not.toHaveBeenCalled();
});
it("preserves password confirmation checks before updating",async()=>{
 const form=passwordForm();form.set("passwordConfirmation","different password");await expect(updatePassword(form)).rejects.toThrow("redirect:/reset-password?error=password_mismatch");expect(mocks.update).not.toHaveBeenCalled();
});
it("clears only the recovery session and returns to shared sign-in after success",async()=>{
 await expect(updatePassword(passwordForm())).rejects.toThrow("redirect:https://endvora.com/login?reset=1");
 expect(mocks.update).toHaveBeenCalledWith({password:"long passphrase 123"});expect(mocks.signOut).toHaveBeenCalledWith({scope:"local"});
});
it("renders matching bounds, guidance, alerts and recovery navigation",async()=>{
 const html=renderToStaticMarkup(await ResetPasswordPage({searchParams:Promise.resolve({error:"password_mismatch"})}));
 expect(html).toContain('minLength="12"');expect(html).toContain('maxLength="72"');expect(html).toContain("Use 12–72 characters.");expect(html).toContain('role="alert"');expect(html).toContain('href="/forgot-password"');expect(html).toContain('href="https://endvora.com/login"');
 const forgot=renderToStaticMarkup(await ForgotPasswordPage({searchParams:Promise.resolve({sent:"1"})}));expect(forgot).toContain("If an account exists");expect(forgot).toContain('href="https://endvora.com/login"');
});
