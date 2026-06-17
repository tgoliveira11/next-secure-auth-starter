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
import { PasswordSetupFields } from "../features/password/password-setup-fields.js";
import { ACCOUNT_PASSWORD_RESET_NOTE, accountAuthApi } from "@tgoliveira/secure-auth/client";
import { validatePasswordSetup } from "@tgoliveira/secure-auth/client/password-policy";
import { type ResetPasswordPageProps } from "./types.js";
import { usePageTitle, useUiPaths, useEffectivePasswordPolicy } from "./use-page-ui.js";

type ResetState = "loading" | "invalid" | "ready" | "success";

function ResetPasswordContent({
  token: tokenProp,
  paths,
  submitLabel = "Update password",
  className,
  width = "narrow",
  title: titleProp,
  subtitle,
  passwordStrengthPosition,
}: ResetPasswordPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resolved = useUiPaths(paths);
  const resetTitle = usePageTitle(
    { title: titleProp, subtitle },
    "resetPasswordTitle",
    "Choose a new password"
  );
  const passwordPolicy = useEffectivePasswordPolicy();
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
    if (passwordPolicy.enforcement === "enforce") {
      const setup = validatePasswordSetup({
        password: newPassword,
        confirmation: confirmPassword,
        policy: passwordPolicy,
      });
      if (!setup.valid) {
        setError(
          setup.password.messages[0] ??
            setup.confirmation.message ??
            "Password does not meet the configured policy."
        );
        return;
      }
    } else {
      const setup = validatePasswordSetup({
        password: newPassword,
        confirmation: confirmPassword,
        policy: passwordPolicy,
      });
      if (!setup.password.valid && setup.password.strength === "weak") {
        setError(setup.password.messages[0] ?? "Password is too short.");
        return;
      }
      if (!setup.confirmation.valid) {
        setError(setup.confirmation.message ?? "Passwords do not match.");
        return;
      }
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
      <PageHeader title={resetTitle} description={ACCOUNT_PASSWORD_RESET_NOTE} />
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordSetupFields
            passwordId="reset-new-password"
            confirmId="reset-confirm-password"
            passwordLabel="New password"
            confirmLabel="Confirm new password"
            value={newPassword}
            confirmValue={confirmPassword}
            onChange={setNewPassword}
            onConfirmChange={setConfirmPassword}
            policy={passwordPolicy}
            feedbackPosition={passwordStrengthPosition}
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
