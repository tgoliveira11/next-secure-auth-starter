import type { SecureAuthConfig, SecureAuthServices } from "./types.js";
import { authLoginService } from "../modules/auth/services/auth-login-service.js";
import { authService } from "../modules/auth/services/auth-service.js";
import { accountAuthService } from "../modules/account/services/account-auth-service.js";
import { accountService } from "../modules/account/services/account-service.js";
import { accountSessionService } from "../modules/sessions/services/account-session-service.js";
import { twoFactorService } from "../modules/two-factor/services/two-factor-service.js";
import { passkeyLoginService } from "../modules/passkeys/services/passkey-login-service.js";
import { passkeyAccountService } from "../modules/passkeys/services/passkey-account-service.js";

/**
 * Creates the injected service registry for @tgoliveira/secure-auth.
 * Package services must receive db/config/email/logger through this factory — never read process.env directly.
 */
export function createAuthServices(config: SecureAuthConfig): SecureAuthServices {
  return {
    config,
    db: config.db,
    authLoginService,
    authService,
    accountAuthService,
    accountService,
    accountSessionService,
    twoFactorService,
    passkeyLoginService,
    passkeyAccountService,
  };
}