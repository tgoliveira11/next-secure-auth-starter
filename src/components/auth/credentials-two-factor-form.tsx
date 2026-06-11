import Link from "next/link";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/ui/cn";

const submitButtonClassName = cn(
  "min-h-11 w-full rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium transition-colors",
  "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
);

const TWO_FACTOR_ERROR_MESSAGES: Record<string, string> = {
  invalid_code: "Invalid authenticator or backup code",
  invalid_request: "Enter a valid authenticator or backup code",
  unavailable: "Could not verify your code right now. Please try again.",
};

type CredentialsTwoFactorFormProps = {
  errorCode?: string;
};

export function CredentialsTwoFactorForm({ errorCode }: CredentialsTwoFactorFormProps) {
  const message = errorCode ? TWO_FACTOR_ERROR_MESSAGES[errorCode] : undefined;

  return (
    <form action="/login/2fa" method="post" className="space-y-4" autoComplete="on">
      <input type="hidden" name="mode" value="credentials" />
      <FormField id="login-2fa-code" label="Authenticator code">
        <Input
          id="login-2fa-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
        />
      </FormField>

      <FormField id="login-2fa-backup" label="Backup code (optional)">
        <Input id="login-2fa-backup" name="backupCode" autoComplete="off" />
      </FormField>

      {message && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {message}
        </p>
      )}

      <button type="submit" className={submitButtonClassName}>
        Continue
      </button>

      <p className="text-center text-sm text-[var(--muted)]">
        <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
