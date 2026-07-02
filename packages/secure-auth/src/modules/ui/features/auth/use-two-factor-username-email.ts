"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { authLoginApi } from "../../../../lib/api-client/two-factor.js";

export function useTwoFactorUsernameEmail(mode: "credentials" | "oauth"): string | undefined {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState<string | undefined>();

  useEffect(() => {
    if (mode === "oauth") {
      setEmail(session?.user?.email ?? undefined);
      return;
    }

    let cancelled = false;
    void authLoginApi.challengeStatus().then((result) => {
      if (!cancelled && result.pending && result.email) {
        setEmail(result.email);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mode, session?.user?.email, status]);

  return email;
}
