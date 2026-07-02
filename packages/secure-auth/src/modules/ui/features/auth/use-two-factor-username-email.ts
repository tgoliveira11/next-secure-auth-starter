"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { authLoginApi } from "../../../../lib/api-client/two-factor.js";

export type TwoFactorUsernameEmailState = {
  email?: string;
  isReady: boolean;
};

export function useTwoFactorUsernameEmail(
  mode: "credentials" | "oauth",
  initialUsernameEmail?: string
): TwoFactorUsernameEmailState {
  const { data: session, status } = useSession();
  const [credentialsEmail, setCredentialsEmail] = useState<string | undefined>(initialUsernameEmail);
  const [credentialsReady, setCredentialsReady] = useState(initialUsernameEmail !== undefined);

  useEffect(() => {
    if (mode === "oauth") {
      return;
    }

    if (initialUsernameEmail !== undefined) {
      setCredentialsEmail(initialUsernameEmail);
      setCredentialsReady(true);
      return;
    }

    let cancelled = false;
    void authLoginApi.challengeStatus().then((result) => {
      if (cancelled) return;
      setCredentialsEmail(result.pending ? result.email : undefined);
      setCredentialsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [initialUsernameEmail, mode]);

  if (mode === "oauth") {
    const email = initialUsernameEmail ?? session?.user?.email ?? undefined;
    return {
      email,
      isReady: initialUsernameEmail !== undefined || status !== "loading",
    };
  }

  return {
    email: credentialsEmail,
    isReady: credentialsReady,
  };
}
