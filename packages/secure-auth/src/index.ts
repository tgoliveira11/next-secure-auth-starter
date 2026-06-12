export type {
  SecureAuthConfig,
  SecureAuthDb,
  SecureAuthLogger,
  SecureAuthServices,
  EmailProvider,
  SecureAuthEmailTemplates,
} from "./core/types.js";
export { SECURE_AUTH_PACKAGE_VERSION } from "./core/package-version.js";
export { safeLogger } from "./modules/security/logger/index.js";
export { authSchema } from "./drizzle/schema.js";
export type { AuthSchema, User } from "./drizzle/schema.js";
