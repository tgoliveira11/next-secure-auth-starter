"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { isFullyAuthenticatedSession } from "./session-auth-state.js";
import {
  useAuthenticatedRedirectSettings,
  type AuthenticatedRedirectSettingsInput,
} from "./use-authenticated-redirect-settings.js";

export type GuestOnlyPageGuardResult = {
  shouldRender: boolean;
  isLoading: boolean;
};

export function useGuestOnlyPageGuard(
  props: AuthenticatedRedirectSettingsInput = {}
): GuestOnlyPageGuardResult {
  const { status, data: session } = useSession();
  const router = useRouter();
  const { enabled, redirectTo } = useAuthenticatedRedirectSettings(props);
  const redirected = useRef(false);

  const isLoading = status === "loading";
  const fullyAuthenticated = isFullyAuthenticatedSession(status, session);
  const shouldRedirect = enabled && fullyAuthenticated;

  useEffect(() => {
    if (!shouldRedirect || redirected.current) {
      return;
    }
    redirected.current = true;
    router.replace(redirectTo);
  }, [shouldRedirect, redirectTo, router]);

  return {
    shouldRender: !isLoading && !shouldRedirect,
    isLoading,
  };
}
