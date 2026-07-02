"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "../layouts/page-shell.js";
import { PageHeader } from "../primitives/page-header.js";
import { LoadingState } from "../primitives/loading-state.js";
import { type MagicLinkVerifyPageProps } from "./types.js";
import { usePageTitle, useUiMessage, useUiPaths } from "./use-page-ui.js";

export function MagicLinkVerifyPage({
  brand,
  header,
  className,
  width = "narrow",
  paths,
  afterLoginPath,
  errorMessage = "This magic link is invalid or has expired.",
  title: titleProp,
  subtitle,
  description: descriptionProp,
  token: tokenProp,
}: MagicLinkVerifyPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolved = useUiPaths(paths);
  const destination = afterLoginPath ?? resolved.afterLogin;
  const title = usePageTitle(
    { title: titleProp, subtitle },
    "magicLinkVerifyTitle",
    "Signing you in"
  );
  const description = useUiMessage(
    descriptionProp,
    "magicLinkVerifyDescription",
    "Verifying your magic link securely."
  );
  const [error, setError] = useState("");
  const started = useRef(false);
  const token = tokenProp ?? searchParams.get("token")?.trim() ?? "";

  const verifyMagicLink = useCallback(async () => {
    if (!token || token.length < 16) {
      setError(errorMessage);
      return;
    }

    try {
      const response = await fetch("/api/auth/magic-link/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        setError(errorMessage);
        return;
      }

      const body = (await response.json()) as {
        requiresTwoFactor?: boolean;
        redirectTo?: string;
      };

      if (body.requiresTwoFactor) {
        router.replace(`${resolved.loginTwoFactor}?mode=magic_link`);
        return;
      }

      const completeResponse = await fetch("/api/auth/login/complete", {
        method: "POST",
        credentials: "include",
      });
      if (!completeResponse.ok) {
        setError(errorMessage);
        return;
      }

      const { loginToken } = (await completeResponse.json()) as { loginToken: string };
      const result = await signIn("login-token", {
        loginToken,
        redirect: false,
      });

      if (result?.error) {
        setError("Could not complete sign-in. Please try again.");
        return;
      }

      router.replace(body.redirectTo ?? destination);
    } catch {
      setError("Could not complete sign-in. Please try again.");
    }
  }, [destination, errorMessage, resolved.loginTwoFactor, router, token]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void verifyMagicLink();
  }, [verifyMagicLink]);

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
        <LoadingState label="Verifying magic link" />
      )}
    </PageShell>
  );
}
