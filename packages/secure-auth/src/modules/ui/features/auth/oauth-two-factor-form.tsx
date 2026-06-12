"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormField } from "../../primitives/form-field.js";
import { Input } from "../../primitives/input.js";
import { Button } from "../../primitives/button.js";
import { ApiError, authLoginApi, readNamedFormField } from "@tgoliveira/secure-auth/client";

export type OAuthTwoFactorFormProps = {
  afterLoginPath?: string;
  submitLabel?: string;
};

export function OAuthTwoFactorForm({
  afterLoginPath = "/dashboard",
  submitLabel = "Continue",
}: OAuthTwoFactorFormProps) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const submittedCode = readNamedFormField(form, "code").trim();
    const submittedBackupCode = readNamedFormField(form, "backupCode").trim();

    try {
      if (!session?.user?.id) {
        setError("Authentication required.");
        setLoading(false);
        return;
      }

      const result = await authLoginApi.verifyOAuthTwoFactor({
        code: submittedCode || undefined,
        backupCode: submittedBackupCode || undefined,
      });
      await update({ twoFactorUpgradeToken: result.upgradeToken });
      router.push(afterLoginPath);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Invalid authenticator or backup code");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
      <FormField id="login-2fa-code" label="Authenticator code">
        <Input
          id="login-2fa-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
        />
      </FormField>

      <FormField id="login-2fa-backup" label="Backup code (optional)">
        <Input id="login-2fa-backup" name="backupCode" autoComplete="off" />
      </FormField>

      {error && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Verifying…" : submitLabel}
      </Button>
    </form>
  );
}
