import type { SecureAuthDb } from "./types.js";
import { createUserRepository } from "../modules/account/repositories/user-repository.js";
import { createAccountTokenRepository } from "../modules/account/repositories/account-token-repository.js";
import { createAccountSessionRepository } from "../modules/sessions/repositories/account-session-repository.js";
import { createTwoFactorRepository } from "../modules/two-factor/repositories/two-factor-repository.js";
import { createPasskeyRepository } from "../modules/passkeys/repositories/passkey-repository.js";
import { createAuditRepository } from "../modules/audit/repositories/audit-repository.js";
import { createAdminUserRepository } from "../modules/admin/repositories/admin-user-repository.js";
import { createLockoutRepository } from "../modules/admin/repositories/lockout-repository.js";
import { createInviteRepository } from "../modules/admin/repositories/invite-repository.js";
import { createApiKeyRepository } from "../modules/admin/repositories/api-key-repository.js";
import { createConfigOverrideRepository } from "../modules/admin/repositories/config-override-repository.js";

export function createRepositories({ db }: { db: SecureAuthDb }) {
  return {
    userRepository: createUserRepository(db),
    accountTokenRepository: createAccountTokenRepository(db),
    accountSessionRepository: createAccountSessionRepository(db),
    twoFactorRepository: createTwoFactorRepository(db),
    passkeyRepository: createPasskeyRepository(db),
    auditRepository: createAuditRepository(db),
    adminUserRepository: createAdminUserRepository(db),
    lockoutRepository: createLockoutRepository(db),
    inviteRepository: createInviteRepository(db),
    apiKeyRepository: createApiKeyRepository(db),
    configOverrideRepository: createConfigOverrideRepository(db),
  };
}

export type SecureAuthRepositories = ReturnType<typeof createRepositories>;
