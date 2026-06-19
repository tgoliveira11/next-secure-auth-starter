import type { SecureAuthConfig, SecureAuthServices } from "./types.js";
import { createRepositories } from "./create-repositories.js";
import { createSecureAuthContext } from "./create-secure-auth-context.js";
import { createRunInTransaction } from "../lib/db/transaction.js";
import { createRateLimitApi } from "../modules/rate-limit/index.js";
import { createAuthService } from "../modules/auth/services/auth-service.js";
import { createAuthLoginService } from "../modules/auth/services/auth-login-service.js";
import { createAccountAuthService } from "../modules/account/services/account-auth-service.js";
import { createAccountService } from "../modules/account/services/account-service.js";
import { createAccountSessionService } from "../modules/sessions/services/account-session-service.js";
import { createTwoFactorService } from "../modules/two-factor/services/two-factor-service.js";
import { createPasskeyLoginService } from "../modules/passkeys/services/passkey-login-service.js";
import { createPasskeyAccountService } from "../modules/passkeys/services/passkey-account-service.js";
import { createMagicLinkService } from "../modules/auth/services/magic-link-service.js";
import { createSecurityNotificationService } from "../modules/security/notifications/security-notification-service.js";
import { createAuthOptions } from "../modules/auth/lib/auth-options.js";

/**
 * Creates the injected service registry for @tgoliveira/secure-auth.
 * Package services must receive db/config/email/logger through this factory — never read process.env directly.
 */
export function createAuthServices(config: SecureAuthConfig): SecureAuthServices {
  const db = config.db;
  const repos = createRepositories({ db });
  const ctx = createSecureAuthContext({ config });
  const rateLimit = createRateLimitApi({ config, db });
  const runInTransaction = createRunInTransaction(db);

  const securityNotificationService = createSecurityNotificationService({ config, ctx, repos });

  const authService = createAuthService({ ctx, repos, rateLimit });
  const twoFactorService = createTwoFactorService({
    ctx,
    repos,
    rateLimit,
    runInTransaction,
    securityNotificationService,
  });
  const authLoginService = createAuthLoginService({
    config,
    ctx,
    repos,
    rateLimit,
    authService,
    twoFactorService,
  });
  const accountAuthService = createAccountAuthService({
    ctx,
    repos,
    rateLimit,
    runInTransaction,
    securityNotificationService,
  });
  const accountService = createAccountService({ repos, rateLimit, runInTransaction });
  const accountSessionService = createAccountSessionService({
    config,
    ctx,
    repos,
    rateLimit,
    securityNotificationService,
  });
  const passkeyLoginService = createPasskeyLoginService({
    config,
    ctx,
    repos,
    rateLimit,
    authLoginService,
    authService,
    twoFactorService,
  });
  const passkeyAccountService = createPasskeyAccountService({
    ctx,
    repos,
    rateLimit,
    runInTransaction,
  });
  const magicLinkService = createMagicLinkService({
    config,
    ctx,
    repos,
    rateLimit,
    authLoginService,
    authService,
    twoFactorService,
    securityNotificationService,
  });

  const getAuthOptions = () =>
    createAuthOptions({
      config,
      repos,
      authService,
      authLoginService,
      twoFactorService,
      accountSessionService,
    });

  return {
    config,
    db,
    ctx,
    repos,
    rateLimit,
    runInTransaction,
    authLoginService,
    authService,
    accountAuthService,
    accountService,
    accountSessionService,
    twoFactorService,
    passkeyLoginService,
    passkeyAccountService,
    magicLinkService,
    securityNotificationService,
    getAuthOptions,
  };
}
