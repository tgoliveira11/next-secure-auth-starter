import Link from "next/link";
import { TwoFactorOtpFields } from "./two-factor-otp-fields.js";
import { cn } from "@tgoliveira/secure-auth/client";

const submitButtonClassName = cn(
  "min-h-11 w-full rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium transition-colors",
  "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
);

const TWO_FACTOR_ERROR_MESSAGES: Record<string, string> = {
  invalid_code: "Invalid authenticator or backup code",
  invalid_request: "Enter a valid authenticator or backup code",
  unavailable: "Could not verify your code right now. Please try again.",
};

export type TwoFactorLoginFormProps = {
  mode: "credentials" | "oauth";
  errorCode?: string;
  formAction?: string;
  loginPath?: string;
  submitLabel?: string;
  usernameEmail?: string;
};

export function TwoFactorLoginForm({
  mode,
  errorCode,
  formAction = "/login/2fa",
  loginPath = "/login",
  submitLabel = "Continue",
  usernameEmail,
}: TwoFactorLoginFormProps) {
  const message = errorCode ? TWO_FACTOR_ERROR_MESSAGES[errorCode] : undefined;

  return (
    <form action={formAction} method="post" className="relative space-y-4" autoComplete="on">
      <input type="hidden" name="mode" value={mode} />
      <TwoFactorOtpFields usernameEmail={usernameEmail} />

      {message && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {message}
        </p>
      )}

      <button type="submit" className={submitButtonClassName}>
        {submitLabel}
      </button>

      <p className="text-center text-sm text-[var(--muted)]">
        <Link href={loginPath} className="font-medium text-[var(--primary)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
