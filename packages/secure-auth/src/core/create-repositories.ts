import type { SecureAuthDb } from "./types.js";
import { createUserRepository } from "../modules/account/repositories/user-repository.js";
import { createAccountTokenRepository } from "../modules/account/repositories/account-token-repository.js";
import { createAccountSessionRepository } from "../modules/sessions/repositories/account-session-repository.js";
import { createTwoFactorRepository } from "../modules/two-factor/repositories/two-factor-repository.js";
import { createPasskeyRepository } from "../modules/passkeys/repositories/passkey-repository.js";
import { createAuditRepository } from "../modules/audit/repositories/audit-repository.js";
import { createAdminUserRepository } from "../modules/admin/repositories/admin-user-repository.js";

export function createRepositories({ db }: { db: SecureAuthDb }) {
  return {
    userRepository: createUserRepository(db),
    accountTokenRepository: createAccountTokenRepository(db),
    accountSessionRepository: createAccountSessionRepository(db),
    twoFactorRepository: createTwoFactorRepository(db),
    passkeyRepository: createPasskeyRepository(db),
    auditRepository: createAuditRepository(db),
    adminUserRepository: createAdminUserRepository(db),
  };
}

export type SecureAuthRepositories = ReturnType<typeof createRepositories>;
