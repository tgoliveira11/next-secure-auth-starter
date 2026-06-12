"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { PageShell } from "../layouts/page-shell.js";
import { Card } from "../primitives/card.js";
import { PageHeader } from "../primitives/page-header.js";
import { Alert } from "../primitives/alert.js";
import { Button } from "../primitives/button.js";
import { LoadingState } from "../primitives/loading-state.js";
import { PasswordStrengthField } from "../features/auth/password-strength-field.js";
import { ACCOUNT_PASSWORD_RESET_NOTE, accountAuthApi } from "@tgoliveira/secure-auth/client";
import { assessPassword } from "@tgoliveira/secure-auth/client/password-policy";
import { resolveAuthPaths, type ResetPasswordPageProps } from "./types.js";

type ResetState = "loading" | "invalid" | "ready" | "success";

function ResetPasswordContent({
  token: tokenProp,
  paths,
  submitLabel = "Update password",
  className,
  width = "narrow",
}: ResetPasswordPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resolved = resolveAuthPaths(paths);
  const token = tokenProp ?? searchParams.get("token") ?? "";
  const [state, setState] = useState<ResetState>("loading");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    let cancelled = false;
    accountAuthApi
      .validateResetToken(token)
      .then((result) => {
        if (!cancelled) setState(result.valid ? "ready" : "invalid");
      })
      .catch(() => {
        if (!cancelled) setState("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const assessment = assessPassword(newPassword);
    if (!assessment.meetsPolicy && assessment.label === "too_short") {
      setError(assessment.messages[0] ?? "Password is too short.");
      return;
    }

    setLoading(true);
    try {
      await accountAuthApi.resetPassword(token, newPassword);
      setState("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

  if (state === "loading") {
    return (
      <PageShell width={width} className={className}>
        <LoadingState label="Checking reset link" />
      </PageShell>
    );
  }

  if (state === "invalid") {
    return (
      <PageShell width={width} className={className}>
        <PageHeader
          title="Reset link expired"
          description="This reset link is invalid or expired. You can request a new one."
        />
        <Card>
          <Link href={resolved.forgotPassword} className="block">
            <Button className="w-full">Request a new reset link</Button>
          </Link>
        </Card>
      </PageShell>
    );
  }

  if (state === "success") {
    return (
      <PageShell width={width} className={className}>
        <PageHeader
          title="Password updated"
          description="Your password has been updated. You can now sign in with your new password."
        />
        <Card className="space-y-4">
          <Alert variant="muted">{ACCOUNT_PASSWORD_RESET_NOTE}</Alert>
          <Button className="w-full" onClick={() => router.push(resolved.login)}>
            Continue to sign in
          </Button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell width={width} className={className}>
      <PageHeader title="Choose a new password" description={ACCOUNT_PASSWORD_RESET_NOTE} />
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordStrengthField
            id="reset-new-password"
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            confirmValue={confirmPassword}
          />
          <PasswordStrengthField
            id="reset-confirm-password"
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            confirmValue={newPassword}
            showStrength={false}
          />
          {error && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Updating…" : submitLabel}
          </Button>
        </form>
      </Card>
    </PageShell>
  );
}

export function ResetPasswordPage(props: ResetPasswordPageProps) {
  return (
    <Suspense
      fallback={
        <PageShell width={props.width ?? "narrow"} className={props.className}>
          <LoadingState label="Checking reset link" />
        </PageShell>
      }
    >
      <ResetPasswordContent {...props} />
    </Suspense>
  );
}
