"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";

export default function LoginCompletePage() {
  const router = useRouter();
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
            setError("Your sign-in session expired. Please sign in again.");
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

        router.replace("/dashboard");
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
  }, [router]);

  return (
    <PageLayout width="narrow" hideNav>
      <PageHeader title="Signing you in" description="Finishing your sign-in securely." />
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}{" "}
          <a href="/login" className="font-medium text-[var(--primary)] hover:underline">
            Back to sign in
          </a>
        </p>
      ) : (
        <LoadingState label="Completing sign-in" />
      )}
    </PageLayout>
  );
}
