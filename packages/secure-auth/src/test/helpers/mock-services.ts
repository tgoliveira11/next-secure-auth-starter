import type { SecureAuthConfig, SecureAuthServices } from "../../core/types.js";
import { createTestSecureAuth } from "./create-test-secure-auth.js";

/** Resolve test services, optionally overriding config and merging partial service fields. */
export async function getTestServices(
  configOverrides: Partial<SecureAuthConfig> = {},
  merge?: (base: SecureAuthServices) => Partial<SecureAuthServices>
): Promise<SecureAuthServices> {
  const base = await createTestSecureAuth(configOverrides).getServices();
  if (!merge) return base;

  const partial = merge(base);
  return {
    ...base,
    ...partial,
    repos: partial.repos ? { ...base.repos, ...partial.repos } : base.repos,
  };
}
