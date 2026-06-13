"use client";

import { getSession, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";
import { useSecureAuthUi } from "./secure-auth-ui-provider.js";

async function terminateRevokedSession(loginPath: string): Promise<void> {
  await signOut({ redirect: false });
  window.location.replace(loginPath);
}

/**
 * When single active session is enabled, polls the server session and forces a local
 * sign-out when this browser's session was revoked (e.g. after login elsewhere).
 */
export function SingleActiveSessionMonitor() {
  const ui = useSecureAuthUi();
  const { status } = useSession();
  const signingOut = useRef(false);
  const loginPath = ui?.paths.login ?? "/login";
  const intervalSeconds = ui?.sessionPolicy.revocationPollIntervalSeconds ?? 0;

  const verifySessionStillValid = useCallback(async () => {
    if (signingOut.current) return;

    const session = await getSession();
    if (!session?.user) {
      signingOut.current = true;
      await terminateRevokedSession(loginPath);
    }
  }, [loginPath]);

  useEffect(() => {
    if (!ui?.sessionPolicy.singleActiveSession || intervalSeconds <= 0) {
      return;
    }
    if (status !== "authenticated") {
      return;
    }

    void verifySessionStillValid();

    const intervalMs = intervalSeconds * 1000;
    const timer = window.setInterval(() => {
      void verifySessionStillValid();
    }, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void verifySessionStillValid();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    ui?.sessionPolicy.singleActiveSession,
    intervalSeconds,
    status,
    verifySessionStillValid,
  ]);

  useEffect(() => {
    if (status === "unauthenticated") {
      signingOut.current = false;
    }
  }, [status]);

  return null;
}
