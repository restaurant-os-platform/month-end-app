export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_REQUIREMENT = "Use 12–72 characters.";
export const PASSWORD_SAVE_FAILED = "Your password could not be saved. Please try again.";
export const PASSWORD_MISMATCH = "The passwords do not match.";

/** Applies when choosing a new password; existing sign-in credentials are unchanged. */
export function validNewPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH;
}
