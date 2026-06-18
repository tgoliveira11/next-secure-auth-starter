"use client";

import { DEFAULT_AUTH_PATHS } from "../pages/types.js";
import { useSecureAuthUi } from "../secure-auth-ui-provider.js";

export type AuthenticatedRedirectSettingsInput = {
  redirectIfAuthenticated?: boolean;
  authenticatedRedirectPath?: string;
};

export function useAuthenticatedRedirectSettings(
  props: AuthenticatedRedirectSettingsInput = {}
) {
  const ui = useSecureAuthUi();

  const enabled =
    props.redirectIfAuthenticated ??
    ui?.auth?.redirectAuthenticatedFromGuestPages ??
    true;

  const redirectTo =
    props.authenticatedRedirectPath ??
    ui?.auth?.authenticatedRedirectPath ??
    ui?.paths.afterLogin ??
    DEFAULT_AUTH_PATHS.afterLogin;

  return { enabled, redirectTo };
}
