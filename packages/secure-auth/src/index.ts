export type {
  SecureAuthConfig,
  SecureAuthDb,
  SecureAuthLogger,
  SecureAuthServices,
  EmailProvider,
  SecureAuthEmailContent,
  SecureAuthEmailTemplates,
  SecureAuthJsonValue,
  PasskeyLoginAuthenticationExtensions,
  PasskeyLoginAuthenticationExtensionsContext,
  WebAuthnOriginAliasPolicy,
  PortableVaultBrokerReceiptPublicJwk,
  PortableVaultGrantPrivateJwk,
  PortableVaultGrantsConfig,
  PortableVaultGrantsEnabledConfig,
} from "./core/types.js";
export { SECURE_AUTH_PACKAGE_VERSION } from "./core/package-version.js";
export { safeLogger } from "./modules/security/logger/index.js";
export { authSchema } from "./drizzle/schema.js";
export type { AuthSchema, User } from "./drizzle/schema.js";
export {
  PORTABLE_VAULT_GRANT_PURPOSE,
  PORTABLE_VAULT_GRANT_VERSION,
} from "./modules/passkeys/lib/portable-vault-grant-types.js";
export type {
  PortableVaultBrokerReceiptClaimsV1,
  PortableVaultEphemeralPublicKeyJwk,
  PortableVaultGrantAction,
  PortableVaultGrantClaimsV1,
  PortableVaultGrantFinalizeResponse,
  PortableVaultGrantOptionsRequest,
  PortableVaultGrantOptionsResponse,
  PortableVaultGrantVerifyRequest,
  PortableVaultGrantVerifyResponse,
} from "./modules/passkeys/lib/portable-vault-grant-types.js";
