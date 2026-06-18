import type { PublicAuthRedirectConfig } from "../../core/auth-redirect-config.js";

/** Default public auth redirect settings for tests and stories. */
export const DEFAULT_TEST_PUBLIC_AUTH: PublicAuthRedirectConfig = {
  redirectAuthenticatedFromGuestPages: true,
  authenticatedRedirectPath: "/dashboard",
};
