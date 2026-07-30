import type { SecureAuthConfig } from "../core/types.js";
import { resolvePasswordPolicyConfig } from "../core/config-accessors.js";
import { validateCaptchaConfig } from "../modules/captcha/index.js";
import { validatePortableVaultGrantsConfig } from "../modules/passkeys/lib/portable-vault-grant-crypto.js";
import {
  applyUIConfigOverrides,
  buildPublicUIConfig,
  type SecureAuthUIPublicConfig,
} from "../core/ui-config.js";
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
  validatePortableVaultGrantsConfig(config);
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
    /**
     * UI config with admin panel overrides applied.
     *
     * Reads the config-override store (cached for `admin.configCacheTtlSeconds`), so the
     * calling layout becomes dynamic. Falls back to the static config when the store is
     * unavailable — an unreachable admin table must never break sign-in.
     */
    async getResolvedUIConfig(): Promise<SecureAuthUIPublicConfig> {
      try {
        const resolvedServices = await getServices();
        const overrides = await resolvedServices.configOverrideService.getOverrides();
        return applyUIConfigOverrides(uiConfig, overrides);
      } catch {
        return uiConfig;
      }
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
