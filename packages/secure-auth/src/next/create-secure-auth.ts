import type { SecureAuthConfig } from "../core/types.js";
import { resolvePasswordPolicyConfig } from "../core/config-accessors.js";
import { validateCaptchaConfig } from "../modules/captcha/index.js";
import { buildPublicUIConfig, type SecureAuthUIPublicConfig } from "../core/ui-config.js";
import {
  buildMiddlewareConfig,
  type SecureAuthMiddlewareConfig,
} from "./middleware/create-secure-auth-middleware.js";
import { createAuthServices } from "../core/create-auth-services.js";
import { createRoutes } from "../server/routes/create-routes.js";
import type { PasswordPolicyConfig } from "../modules/security/password-policy/index.js";

export type SecureAuth = ReturnType<typeof createSecureAuth>;

/**
 * Single configuration entry point for consuming applications.
 * Heavy service modules load lazily on first route invocation to keep Next.js builds lean.
 */
export function createSecureAuth(config: SecureAuthConfig) {
  validateCaptchaConfig(config);
  const passwordPolicy: PasswordPolicyConfig = resolvePasswordPolicyConfig(config);
  const uiConfig = buildPublicUIConfig(config);
  const middlewareConfig: SecureAuthMiddlewareConfig = buildMiddlewareConfig(config, uiConfig);

  let services: ReturnType<typeof createAuthServices> | undefined;

  const getServices = () => {
    if (!services) {
      services = createAuthServices(config);
    }
    return Promise.resolve(services);
  };

  const routes = createRoutes(getServices);

  return {
    config,
    passwordPolicy,
    uiConfig,
    middlewareConfig,
    get ui() {
      return uiConfig;
    },
    getPublicUIConfig(): SecureAuthUIPublicConfig {
      return uiConfig;
    },
    get services() {
      throw new Error(
        "@tgoliveira/secure-auth: use await secureAuth.getServices() — services load asynchronously."
      );
    },
    getServices,
    routes,
  };
}
