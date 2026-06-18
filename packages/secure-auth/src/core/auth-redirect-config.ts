import { DEFAULT_AUTH_PATHS } from "../modules/ui/pages/types.js";
import type { SecureAuthConfig } from "./types.js";

/** Serializable authenticated-user redirect settings for client UI and middleware. */
export type PublicAuthRedirectConfig = {
  redirectAuthenticatedFromGuestPages: boolean;
  authenticatedRedirectPath: string;
};

/** Default guest-only routes redirected when the user is fully authenticated. */
export const DEFAULT_GUEST_ONLY_PATH_KEYS = ["login", "register", "forgotPassword"] as const;

export type GuestOnlyPathKey = (typeof DEFAULT_GUEST_ONLY_PATH_KEYS)[number];

export function resolveAuthenticatedRedirectPath(
  config: SecureAuthConfig,
  resolvedAfterLoginPath: string = DEFAULT_AUTH_PATHS.afterLogin
): string {
  return (
    config.auth.authenticatedRedirectPath ??
    config.auth.afterLoginPath ??
    resolvedAfterLoginPath
  );
}

export function resolveRedirectAuthenticatedFromGuestPages(config: SecureAuthConfig): boolean {
  return config.auth.redirectAuthenticatedFromGuestPages !== false;
}

export function buildPublicAuthRedirectConfig(
  config: SecureAuthConfig,
  resolvedAfterLoginPath: string
): PublicAuthRedirectConfig {
  return {
    redirectAuthenticatedFromGuestPages: resolveRedirectAuthenticatedFromGuestPages(config),
    authenticatedRedirectPath: resolveAuthenticatedRedirectPath(config, resolvedAfterLoginPath),
  };
}
