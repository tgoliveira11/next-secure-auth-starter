import type { SecureAuthConfig } from "./types.js";
import * as configAccessors from "./config-accessors.js";
import { createAuthTraceApi, type AuthTraceApi } from "../modules/auth/lib/auth-trace.js";
import { deliverAccountEmail } from "../modules/email/delivery.js";
import {
  passwordResetEmailContent,
  verificationEmailContent,
} from "../modules/email/templates/account-email-templates.js";
import {
  getPrimaryWebAuthnOrigin,
  getWebAuthnOrigins,
  getWebAuthnRpId,
  getWebAuthnRpName,
  toPasskeyVerificationErrorMessage,
} from "../modules/passkeys/lib/webauthn-config.js";
import {
  clearLoginPendingTokenCookie,
  getLoginPendingTokenCookieName,
  getLoginPendingTokenCookieOptions,
} from "../modules/auth/lib/login-pending-cookie.js";
import {
  clearLoginChallengeCookie,
  getLoginChallengeCookieOptions,
  getTwoFactorLoginChallengeCookieName,
} from "../modules/two-factor/lib/login-challenge-cookie.js";
import {
  clearTwoFactorOAuthUpgradeCookie,
  getTwoFactorOAuthUpgradeCookieName,
  getTwoFactorOAuthUpgradeCookieOptions,
} from "../modules/two-factor/lib/oauth-upgrade-cookie.js";
import { getTwoFactorIssuer } from "../modules/two-factor/lib/constants.js";
import {
  getSessionLastUsedUpdateIntervalMs,
  getSessionMaxAgeMs,
} from "../modules/sessions/lib/session-config.js";
import { getAccountPolicyConfig } from "../modules/account/lib/account-policy-config.js";
import {
  getPasswordPolicyConfig,
  validatePasswordForSubmission,
} from "../modules/security/password-policy/index.js";
import { createOpaqueToken, hashOpaqueToken } from "../modules/security/policies/login-token.js";
import { hashEmailForScope } from "../modules/security/scopes/email-scope.js";
import { hashIp, maskIp } from "../modules/security/ip/session-ip.js";
import { hashUserAgent } from "../modules/security/user-agent/metadata.js";
import {
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
} from "../modules/two-factor/policies/two-factor-secret-crypto.js";
import { hashBackupCode } from "../modules/two-factor/policies/backup-code.js";

export type SecureAuthContext = {
  readonly config: SecureAuthConfig;
  readonly authTrace: AuthTraceApi;
  getAppSlug: () => string;
  getAppName: () => string;
  requireNextAuthSecret: () => string;
  requireTwoFactorEncryptionKey: () => string;
  createOpaqueToken: typeof createOpaqueToken;
  hashOpaqueToken: (token: string) => string;
  hashEmailForScope: (email: string) => string;
  hashIp: (ip: string) => string;
  maskIp: typeof maskIp;
  hashUserAgent: (userAgent: string) => string;
  deliverAccountEmail: (
    input: Parameters<typeof deliverAccountEmail>[1]
  ) => ReturnType<typeof deliverAccountEmail>;
  verificationEmailContent: (token: string) => ReturnType<typeof verificationEmailContent>;
  passwordResetEmailContent: (token: string) => ReturnType<typeof passwordResetEmailContent>;
  getPrimaryWebAuthnOrigin: () => string;
  getWebAuthnOrigins: () => string[];
  getWebAuthnRpId: () => string;
  getWebAuthnRpName: () => string;
  toPasskeyVerificationErrorMessage: (error: unknown) => string;
  getLoginPendingTokenCookieName: () => string;
  getLoginPendingTokenCookieOptions: () => ReturnType<typeof getLoginPendingTokenCookieOptions>;
  clearLoginPendingTokenCookie: (
    response: Parameters<typeof clearLoginPendingTokenCookie>[1]
  ) => void;
  getTwoFactorLoginChallengeCookieName: () => string;
  getLoginChallengeCookieOptions: () => ReturnType<typeof getLoginChallengeCookieOptions>;
  clearLoginChallengeCookie: (response: Parameters<typeof clearLoginChallengeCookie>[1]) => void;
  getTwoFactorOAuthUpgradeCookieName: () => string;
  getTwoFactorOAuthUpgradeCookieOptions: () => ReturnType<typeof getTwoFactorOAuthUpgradeCookieOptions>;
  clearTwoFactorOAuthUpgradeCookie: (
    response: Parameters<typeof clearTwoFactorOAuthUpgradeCookie>[1]
  ) => void;
  getTwoFactorIssuer: () => string;
  getSessionMaxAgeMs: () => number;
  getSessionLastUsedUpdateIntervalMs: () => number;
  getAccountPolicyConfig: () => ReturnType<typeof getAccountPolicyConfig>;
  getPasswordPolicyConfig: () => ReturnType<typeof getPasswordPolicyConfig>;
  validatePasswordForSubmission: (
    password: string
  ) => ReturnType<typeof validatePasswordForSubmission>;
  encryptTwoFactorSecret: (
    plaintext: string
  ) => ReturnType<typeof encryptTwoFactorSecret>;
  decryptTwoFactorSecret: (
    payload: Parameters<typeof decryptTwoFactorSecret>[1]
  ) => ReturnType<typeof decryptTwoFactorSecret>;
  hashBackupCode: (code: string) => string;
};

export function createSecureAuthContext({ config }: { config: SecureAuthConfig }): SecureAuthContext {
  const authTrace = createAuthTraceApi(config);

  return {
    config,
    authTrace,
    getAppSlug: () => configAccessors.getAppSlug(config),
    getAppName: () => configAccessors.getAppName(config),
    requireNextAuthSecret: () => configAccessors.requireNextAuthSecret(config),
    requireTwoFactorEncryptionKey: () => configAccessors.requireTwoFactorEncryptionKey(config),
    createOpaqueToken,
    hashOpaqueToken: (token) => hashOpaqueToken(config, token),
    hashEmailForScope: (email) => hashEmailForScope(config, email),
    hashIp: (ip) => hashIp(config, ip),
    maskIp,
    hashUserAgent: (userAgent) => hashUserAgent(config, userAgent),
    deliverAccountEmail: (input) => deliverAccountEmail(config, input),
    verificationEmailContent: (token) => verificationEmailContent(config, token),
    passwordResetEmailContent: (token) => passwordResetEmailContent(config, token),
    getPrimaryWebAuthnOrigin: () => getPrimaryWebAuthnOrigin(config),
    getWebAuthnOrigins: () => getWebAuthnOrigins(config),
    getWebAuthnRpId: () => getWebAuthnRpId(config),
    getWebAuthnRpName: () => getWebAuthnRpName(config),
    toPasskeyVerificationErrorMessage: (error) =>
      toPasskeyVerificationErrorMessage(config, error),
    getLoginPendingTokenCookieName: () => getLoginPendingTokenCookieName(config),
    getLoginPendingTokenCookieOptions: () => getLoginPendingTokenCookieOptions(config),
    clearLoginPendingTokenCookie: (response) => clearLoginPendingTokenCookie(config, response),
    getTwoFactorLoginChallengeCookieName: () => getTwoFactorLoginChallengeCookieName(config),
    getLoginChallengeCookieOptions: () => getLoginChallengeCookieOptions(config),
    clearLoginChallengeCookie: (response) => clearLoginChallengeCookie(config, response),
    getTwoFactorOAuthUpgradeCookieName: () => getTwoFactorOAuthUpgradeCookieName(config),
    getTwoFactorOAuthUpgradeCookieOptions: () => getTwoFactorOAuthUpgradeCookieOptions(config),
    clearTwoFactorOAuthUpgradeCookie: (response) =>
      clearTwoFactorOAuthUpgradeCookie(config, response),
    getTwoFactorIssuer: () => getTwoFactorIssuer(config),
    getSessionMaxAgeMs: () => getSessionMaxAgeMs(config),
    getSessionLastUsedUpdateIntervalMs: () => getSessionLastUsedUpdateIntervalMs(config),
    getAccountPolicyConfig: () => getAccountPolicyConfig(config),
    getPasswordPolicyConfig: () => getPasswordPolicyConfig(config),
    validatePasswordForSubmission: (password) =>
      validatePasswordForSubmission(password, getPasswordPolicyConfig(config)),
    encryptTwoFactorSecret: (plaintext) => encryptTwoFactorSecret(config, plaintext),
    decryptTwoFactorSecret: (payload) => decryptTwoFactorSecret(config, payload),
    hashBackupCode: (code) => hashBackupCode(config, code),
  };
}
