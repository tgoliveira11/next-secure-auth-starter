export {
  createSecureAuthMiddleware,
  buildMiddlewareConfig,
  buildMiddlewareConfigFromUi,
  defaultSecureAuthMiddlewareMatcher,
  type SecureAuthMiddlewareConfig,
} from "./middleware/create-secure-auth-middleware.js";
export { buildPublicUIConfig, type SecureAuthUIPublicConfig } from "../core/ui-config.js";
