"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "../layouts/page-shell.js";
import { PageHeader } from "../primitives/page-header.js";
import { LoadingState } from "../primitives/loading-state.js";
import { type LoginCompletePageProps } from "./types.js";
import { usePageTitle, useUiMessage, useUiPaths } from "./use-page-ui.js";

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

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      try {
        const response = await fetch("/api/auth/login/complete", {
          method: "POST",
          credentials: "include",
        });
        if (!response.ok) {
          if (!cancelled) {
            setError(errorMessage);
          }
          return;
        }

        const { loginToken } = (await response.json()) as { loginToken: string };
        const result = await signIn("login-token", {
          loginToken,
          redirect: false,
        });
        if (cancelled) return;

        if (result?.error) {
          setError("Could not complete sign-in. Please try again.");
          return;
        }

        router.replace(destination);
      } catch {
        if (!cancelled) {
          setError("Could not complete sign-in. Please try again.");
        }
      }
    }

    void finishSignIn();

    return () => {
      cancelled = true;
    };
  }, [router, destination, errorMessage]);

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
