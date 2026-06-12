import { initSecureAuthRuntime } from "../core/init-runtime.js";
import type { SecureAuthConfig } from "../core/types.js";
import { createRoutes } from "../server/routes/create-routes.js";

export type SecureAuth = ReturnType<typeof createSecureAuth>;

/**
 * Single configuration entry point for consuming applications.
 * Heavy service modules load lazily on first route invocation to keep Next.js builds lean.
 */
export function createSecureAuth(config: SecureAuthConfig) {
  initSecureAuthRuntime(config);

  let servicesPromise: Promise<import("../core/types.js").SecureAuthServices> | undefined;

  const getServices = () => {
    if (!servicesPromise) {
      servicesPromise = import("../core/create-auth-services.js").then(({ createAuthServices }) =>
        createAuthServices(config)
      );
    }
    return servicesPromise;
  };

  const routes = createRoutes(getServices);

  return {
    config,
    get services() {
      throw new Error(
        "@tgoliveira/secure-auth: use await secureAuth.getServices() — services load asynchronously."
      );
    },
    getServices,
    routes,
  };
}
