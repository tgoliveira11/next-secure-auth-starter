"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  hasEmailVerificationRequiredSession,
  hasPendingTwoFactorSession,
  isFullyAuthenticatedSession,
} from "./session-auth-state.js";
import {
  useAuthenticatedRedirectSettings,
  type AuthenticatedRedirectSettingsInput,
} from "./use-authenticated-redirect-settings.js";

export type FlowPageGuardResult = {
  shouldRender: boolean;
  isLoading: boolean;
};

export function useLoginTwoFactorPageGuard(
  input: {
    mode: "credentials" | "oauth";
    loginPath: string;
  } & AuthenticatedRedirectSettingsInput
): FlowPageGuardResult {
  const { status, data: session } = useSession();
  const router = useRouter();
  const { redirectTo } = useAuthenticatedRedirectSettings(input);
  const redirected = useRef(false);

  const isLoading = status === "loading";
  const fullyAuthenticated = isFullyAuthenticatedSession(status, session);
  const pendingTwoFactor = hasPendingTwoFactorSession(status, session);

  let shouldRedirect = false;
  let redirectTarget = redirectTo;

  if (fullyAuthenticated) {
    shouldRedirect = true;
  } else if (input.mode === "oauth" && status === "unauthenticated") {
    shouldRedirect = true;
    redirectTarget = input.loginPath;
  } else if (input.mode === "oauth" && status === "authenticated" && !pendingTwoFactor) {
    shouldRedirect = true;
  }

  useEffect(() => {
    if (!shouldRedirect || redirected.current || isLoading) {
      return;
    }
    redirected.current = true;
    router.replace(redirectTarget);
  }, [shouldRedirect, redirectTarget, router, isLoading]);

  return {
    shouldRender: !isLoading && !shouldRedirect,
    isLoading,
  };
}

export function useCheckEmailPageGuard(
  input: {
    verificationRequired?: boolean;
  } & AuthenticatedRedirectSettingsInput
): FlowPageGuardResult {
  const { status, data: session } = useSession();
  const router = useRouter();
  const { redirectTo } = useAuthenticatedRedirectSettings(input);
  const redirected = useRef(false);

  const isLoading = status === "loading";
  const verificationPending =
    input.verificationRequired === true ||
    hasEmailVerificationRequiredSession(status, session);
  const shouldRedirect =
    status === "authenticated" && !verificationPending && Boolean(session?.user?.id);

  useEffect(() => {
    if (!shouldRedirect || redirected.current || isLoading) {
      return;
    }
    redirected.current = true;
    router.replace(redirectTo);
  }, [shouldRedirect, redirectTo, router, isLoading]);

  return {
    shouldRender: !isLoading && !shouldRedirect,
    isLoading,
  };
}

export function useVerifyEmailPageGuard(
  input: {
    hasToken: boolean;
  } & AuthenticatedRedirectSettingsInput
): FlowPageGuardResult {
  const { status, data: session } = useSession();
  const router = useRouter();
  const { redirectTo } = useAuthenticatedRedirectSettings(input);
  const redirected = useRef(false);

  const isLoading = status === "loading";
  const shouldRedirect = !input.hasToken && isFullyAuthenticatedSession(status, session);

  useEffect(() => {
    if (!shouldRedirect || redirected.current || isLoading) {
      return;
    }
    redirected.current = true;
    router.replace(redirectTo);
  }, [shouldRedirect, redirectTo, router, isLoading]);

  return {
    shouldRender: !isLoading && !shouldRedirect,
    isLoading,
  };
}

export function useLoginCompletePageGuard(
  input: AuthenticatedRedirectSettingsInput & {
    onProceed: () => void;
  }
): FlowPageGuardResult {
  const { status, data: session } = useSession();
  const router = useRouter();
  const { redirectTo } = useAuthenticatedRedirectSettings(input);
  const redirected = useRef(false);
  const proceeded = useRef(false);
  const onProceedRef = useRef(input.onProceed);
  onProceedRef.current = input.onProceed;

  const isLoading = status === "loading";
  const fullyAuthenticated = isFullyAuthenticatedSession(status, session);
  const shouldRedirect = fullyAuthenticated;

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (shouldRedirect) {
      if (!redirected.current) {
        redirected.current = true;
        router.replace(redirectTo);
      }
      return;
    }
    if (!proceeded.current) {
      proceeded.current = true;
      onProceedRef.current();
    }
  }, [isLoading, shouldRedirect, redirectTo, router]);

  return {
    shouldRender: !isLoading && !shouldRedirect,
    isLoading,
  };
}
