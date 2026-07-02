import { createSecureAuth } from "./create-secure-auth.js";
export { createSecureAuth };
export type { SecureAuth } from "./create-secure-auth.js";
export { createNextAuthRouteHandlers } from "../server/routes/handlers/auth/create-nextauth-route-handlers.js";
export {
  createSecureAuthMiddleware,
  buildMiddlewareConfig,
  buildMiddlewareConfigFromUi,
  defaultSecureAuthMiddlewareMatcher,
  type SecureAuthMiddlewareConfig,
} from "./middleware/create-secure-auth-middleware.js";
export { buildPublicUIConfig, type SecureAuthUIPublicConfig, type PublicAuthRedirectConfig } from "../core/ui-config.js";
export { withApiKeyAuth, type ApiKeyPrincipal } from "./api-key-auth.js";
export { getPendingTwoFactorLoginEmail } from "./get-pending-two-factor-login-email.js";
export { getLoginTwoFactorInitialUsernameEmail } from "./get-login-two-factor-initial-username-email.js";