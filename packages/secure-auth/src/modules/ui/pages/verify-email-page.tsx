"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageShell } from "../layouts/page-shell.js";
import { Card } from "../primitives/card.js";
import { PageHeader } from "../primitives/page-header.js";
import { Alert } from "../primitives/alert.js";
import { LoadingState } from "../primitives/loading-state.js";
import { Button } from "../primitives/button.js";
import { accountAuthApi } from "@tgoliveira/secure-auth/client";
import { type VerifyEmailPageProps } from "./types.js";
import { useUiMessage, useUiPaths } from "./use-page-ui.js";
import { useVerifyEmailPageGuard } from "../auth-redirect/use-flow-page-guards.js";

type VerifyState = "loading" | "success" | "invalid";

function VerifyEmailContent({
  token: tokenProp,
  paths,
  className,
  width = "narrow",
  brand,
  header,
  title: titleProp,
  description: descriptionProp,
  authenticatedRedirectPath,
  redirectIfAuthenticated,
}: VerifyEmailPageProps) {
  const searchParams = useSearchParams();
  const resolved = useUiPaths(paths);
  const token = tokenProp ?? searchParams.get("token") ?? "";
  const guard = useVerifyEmailPageGuard({
    hasToken: token.length > 0,
    redirectIfAuthenticated,
    authenticatedRedirectPath: authenticatedRedirectPath ?? resolved.afterLogin,
  });
  const [state, setState] = useState<VerifyState>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const successTitle = useUiMessage(
    titleProp,
    "verifyEmailTitleSuccess",
    "Your email has been verified"
  );
  const invalidTitle = useUiMessage(
    undefined,
    "verifyEmailTitleInvalid",
    "Verification link expired"
  );

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }

    let cancelled = false;
    accountAuthApi
      .confirmVerification(token)
      .then((result) => {
        if (cancelled) return;
        setEmail(result.email);
        setState("success");
      })
      .catch(() => {
        if (!cancelled) setState("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (guard.isLoading) {
    return (
      <PageShell width={width} className={className}>
        <LoadingState label="Verifying your email" />
      </PageShell>
    );
  }

  if (!guard.shouldRender) {
    return null;
  }

  if (state === "loading") {
    return (
      <PageShell width={width} className={className}>
        <LoadingState label="Verifying your email" />
      </PageShell>
    );
  }

  const title = state === "success" ? successTitle : invalidTitle;
  const description =
    descriptionProp ??
    (state === "success"
      ? "You can now sign in and use your account."
      : "This verification link is invalid or expired. You can request a new one.");

  return (
    <PageShell width={width} className={className}>
      {brand}
      {header}
      <PageHeader title={title} description={description} />
      <Card className="space-y-4">
        {state === "success" && email && <Alert variant="success">Verified {email}</Alert>}
        <Link href={resolved.login} className="block">
          <Button className="w-full">Continue to sign in</Button>
        </Link>
        {state === "invalid" && (
          <Link href={resolved.checkEmail} className="block">
            <Button variant="secondary" className="w-full">
              Request a new link
            </Button>
          </Link>
        )}
      </Card>
    </PageShell>
  );
}

export function VerifyEmailPage(props: VerifyEmailPageProps) {
  return (
    <Suspense
      fallback={
        <PageShell width={props.width ?? "narrow"} className={props.className}>
          <LoadingState label="Verifying your email" />
        </PageShell>
      }
    >
      <VerifyEmailContent {...props} />
    </Suspense>
  );
}
