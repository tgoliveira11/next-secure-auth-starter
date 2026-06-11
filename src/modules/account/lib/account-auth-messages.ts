export const ACCOUNT_PASSWORD_RESET_NOTE =
  "This changes your account password only. Other sign-in methods such as passkeys or OAuth remain available.";

export const CHECK_EMAIL_MESSAGE =
  "We sent a verification link to your email address. Verify now or sign in and complete verification later from account settings.";

export const CHECK_EMAIL_REQUIRED_MESSAGE =
  "We sent a verification link to your email address. Verify your email before signing in.";

export function getCheckEmailMessage(requireBeforeSignIn: boolean): string {
  return requireBeforeSignIn ? CHECK_EMAIL_REQUIRED_MESSAGE : CHECK_EMAIL_MESSAGE;
}

export const GENERIC_FORGOT_PASSWORD_MESSAGE =
  "If an account exists for this email, we'll send password reset instructions.";
