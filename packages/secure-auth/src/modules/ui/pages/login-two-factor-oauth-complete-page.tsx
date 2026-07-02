"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "../layouts/page-shell.js";
import { PageHeader } from "../primitives/page-header.js";
import { LoadingState } from "../primitives/loading-state.js";
import { type LoginTwoFactorOauthCompletePageProps } from "./types.js";
import { usePageTitle, useUiMessage, useUiPaths } from "./use-page-ui.js";
import { useLoginTwoFactorPageGuard } from "../auth-redirect/use-flow-page-guards.js";

export function LoginTwoFactorOauthCompletePage({
  brand,
  header,
  className,
  width = "narrow",
  paths,
  afterLoginPath,
  errorMessage = "Your two-factor session expired. Please sign in again.",
  title: titleProp,
  subtitle,
  description: descriptionProp,
  authenticatedRedirectPath,
  redirectIfAuthenticated,
}: LoginTwoFactorOauthCompletePageProps) {
  const router = useRouter();
  const { update } = useSession();
  const resolved = useUiPaths(paths);
  const destination = afterLoginPath ?? resolved.afterLogin;
  const title = usePageTitle(
    { title: titleProp, subtitle },
    "loginTwoFactorOauthCompleteTitle",
    "Finishing two-factor sign-in"
  );
  const description = useUiMessage(
    descriptionProp,
    "loginTwoFactorOauthCompleteDescription",
    "Completing your sign-in securely."
  );
  const [error, setError] = useState("");
  const started = useRef(false);

  const guard = useLoginTwoFactorPageGuard({
    mode: "oauth",
    loginPath: resolved.login,
    redirectIfAuthenticated,
    authenticatedRedirectPath: authenticatedRedirectPath ?? destination,
  });

  useEffect(() => {
    if (guard.isLoading || !guard.shouldRender || started.current || error) {
      return;
    }

    started.current = true;

    void (async () => {
      try {
        const response = await fetch("/api/auth/login/oauth-2fa-complete", {
          method: "POST",
          credentials: "include",
        });
        if (!response.ok) {
          setError(errorMessage);
          return;
        }

        const { upgradeToken } = (await response.json()) as { upgradeToken: string };
        await update({ twoFactorUpgradeToken: upgradeToken });
        router.replace(destination);
      } catch {
        setError("Could not complete sign-in. Please try again.");
      }
    })();
  }, [
    destination,
    error,
    errorMessage,
    guard.isLoading,
    guard.shouldRender,
    router,
    update,
  ]);

  if (guard.isLoading) {
    return (
      <PageShell width={width} className={className}>
        <LoadingState label="Completing two-factor sign-in" />
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
          <Link href={resolved.loginTwoFactor} className="font-medium text-[var(--primary)] hover:underline">
            Try again
          </Link>
        </p>
      ) : (
        <LoadingState label="Completing two-factor sign-in" />
      )}
    </PageShell>
  );
}
