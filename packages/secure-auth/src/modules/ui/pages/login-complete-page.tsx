"use client";

import { useCallback, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "../layouts/page-shell.js";
import { PageHeader } from "../primitives/page-header.js";
import { LoadingState } from "../primitives/loading-state.js";
import { type LoginCompletePageProps } from "./types.js";
import { usePageTitle, useUiMessage, useUiPaths } from "./use-page-ui.js";
import { useLoginCompletePageGuard } from "../auth-redirect/use-flow-page-guards.js";

export function LoginCompletePage({
  brand,
  header,
  className,
  width = "narrow",
  paths,
  afterLoginPath,
  errorMessage = "Your sign-in session expired. Please sign in again.",
  title: titleProp,
  subtitle,
  description: descriptionProp,
  authenticatedRedirectPath,
  redirectIfAuthenticated,
}: LoginCompletePageProps) {
  const router = useRouter();
  const resolved = useUiPaths(paths);
  const destination = afterLoginPath ?? resolved.afterLogin;
  const title = usePageTitle(
    { title: titleProp, subtitle },
    "loginCompleteTitle",
    "Signing you in"
  );
  const description = useUiMessage(
    descriptionProp,
    "loginCompleteDescription",
    "Finishing your sign-in securely."
  );
  const [error, setError] = useState("");

  const finishSignIn = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/login/complete", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        setError(errorMessage);
        return;
      }

      const { loginToken } = (await response.json()) as { loginToken: string };
      const result = await signIn("login-token", {
        loginToken,
        redirect: false,
      });

      if (result?.error) {
        setError("Could not complete sign-in. Please try again.");
        return;
      }

      router.replace(destination);
    } catch {
      setError("Could not complete sign-in. Please try again.");
    }
  }, [destination, errorMessage, router]);

  const guard = useLoginCompletePageGuard({
    redirectIfAuthenticated,
    authenticatedRedirectPath: authenticatedRedirectPath ?? destination,
    onProceed: () => {
      void finishSignIn();
    },
  });

  if (guard.isLoading) {
    return (
      <PageShell width={width} className={className}>
        <LoadingState label="Completing sign-in" />
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
      <PageHeader title={title} description={description} />
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}{" "}
          <Link href={resolved.login} className="font-medium text-[var(--primary)] hover:underline">
            Back to sign in
          </Link>
        </p>
      ) : (
        <LoadingState label="Completing sign-in" />
      )}
    </PageShell>
  );
}
