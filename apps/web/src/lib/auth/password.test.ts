import { expect, it } from "vitest";
import { validNewPassword } from "./password";
it.each(["a".repeat(12),"A".repeat(72),"long passphrase with spaces"])("accepts shared-policy passwords without altering them: %s",password=>expect(validNewPassword(password)).toBe(true));
it.each([null,undefined,123,"short123","a".repeat(11),"a".repeat(73)])("rejects values outside the shared policy: %s",password=>expect(validNewPassword(password)).toBe(false));
