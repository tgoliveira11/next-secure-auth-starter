"use client";

import type { ReactNode } from "react";
import { LoadingState } from "../primitives/loading-state.js";
import {
  useGuestOnlyPageGuard,
  type GuestOnlyPageGuardResult,
} from "./use-guest-only-page-guard.js";
import type { AuthenticatedRedirectSettingsInput } from "./use-authenticated-redirect-settings.js";

export type GuestOnlyPageGuardProps = AuthenticatedRedirectSettingsInput & {
  children: ReactNode;
  loadingLabel?: string;
};

export function GuestOnlyPageGuard({
  children,
  loadingLabel = "Loading",
  ...settings
}: GuestOnlyPageGuardProps) {
  const guard = useGuestOnlyPageGuard(settings);

  if (guard.isLoading) {
    return <LoadingState label={loadingLabel} />;
  }

  if (!guard.shouldRender) {
    return null;
  }

  return <>{children}</>;
}

export type { GuestOnlyPageGuardResult };
