"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageShell } from "../layouts/page-shell.js";
import { Card } from "../primitives/card.js";
import { PageHeader } from "../primitives/page-header.js";
import { Alert } from "../primitives/alert.js";
import { Button } from "../primitives/button.js";
import { getCheckEmailMessage, accountAuthApi } from "@tgoliveira/secure-auth/client";
import { type CheckEmailPageProps } from "./types.js";
import { usePageTitle, useUiPaths } from "./use-page-ui.js";
import { useCheckEmailPageGuard } from "../auth-redirect/use-flow-page-guards.js";
import { LoadingState } from "../primitives/loading-state.js";

function CheckEmailContent({
  email: emailProp,
  verificationRequired: verificationRequiredProp,
  title: titleProp,
  subtitle,
  paths,
  className,
  width = "narrow",
  brand,
  header,
  authenticatedRedirectPath,
  redirectIfAuthenticated,
}: CheckEmailPageProps) {
  const searchParams = useSearchParams();
  const resolved = useUiPaths(paths);
  const title = usePageTitle({ title: titleProp, subtitle }, "checkEmailTitle", "Check your email");
  const email = emailProp ?? searchParams.get("email") ?? "";
  const verificationRequired =
    verificationRequiredProp ?? searchParams.get("required") === "1";
  const checkEmailMessage = getCheckEmailMessage(verificationRequired);
  const guard = useCheckEmailPageGuard({
    verificationRequired,
    redirectIfAuthenticated,
    authenticatedRedirectPath: authenticatedRedirectPath ?? resolved.afterLogin,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    if (!email) {
      setError("Enter your email on the sign-in page to request a new verification link.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await accountAuthApi.resendVerification({ email });
      setMessage(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resend verification email.");
    } finally {
      setLoading(false);
    }
  }

  if (guard.isLoading) {
    return (
      <PageShell width={width} className={className}>
        <LoadingState label="Loading" />
      </PageShell>
    );
  }

  if (!guard.shouldRender) {
    return null;
  }

  return (
    <PageShell width={width} className={className}>
      {brand}
      {header}
      <PageHeader title={title} description={checkEmailMessage} />
      <Card className="space-y-4">
        {email && (
          <p className="text-sm text-[var(--muted)]">
            We sent a link to <span className="text-[var(--foreground)]">{email}</span>.
          </p>
        )}
        <Button variant="secondary" onClick={() => void handleResend()} disabled={loading || !email}>
          {loading ? "Sending…" : "Resend verification email"}
        </Button>
        {message && <Alert variant="muted">{message}</Alert>}
        {error && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
        <p className="text-sm text-[var(--muted)]">
          Already verified?{" "}
          <Link href={resolved.login} className="font-medium text-[var(--primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </PageShell>
  );
}

export function CheckEmailPage(props: CheckEmailPageProps) {
  return (
    <Suspense
      fallback={
        <PageShell width={props.width ?? "narrow"} className={props.className}>
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        </PageShell>
      }
    >
      <CheckEmailContent {...props} />
    </Suspense>
  );
}
