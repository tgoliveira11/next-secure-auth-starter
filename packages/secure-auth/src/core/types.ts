import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ReactNode } from "react";
import type { AuthSchema } from "../drizzle/schema.js";
import type { PasswordPolicyConfig } from "../modules/security/password-policy/index.js";
import type { SecureAuthContext } from "./create-secure-auth-context.js";
import type { SecureAuthRepositories } from "./create-repositories.js";
import type { RateLimitApi } from "../modules/rate-limit/index.js";
import type { RunInTransaction } from "../lib/db/transaction.js";
import type { NextAuthOptions } from "next-auth";
import type { createAuthService } from "../modules/auth/services/auth-service.js";
import type { createAuthLoginService } from "../modules/auth/services/auth-login-service.js";
import type { createAccountAuthService } from "../modules/account/services/account-auth-service.js";
import type { createAccountService } from "../modules/account/services/account-service.js";
import type { createAccountSessionService } from "../modules/sessions/services/account-session-service.js";
import type { createTwoFactorService } from "../modules/two-factor/services/two-factor-service.js";
import type { createPasskeyLoginService } from "../modules/passkeys/services/passkey-login-service.js";
import type { createPasskeyAccountService } from "../modules/passkeys/services/passkey-account-service.js";

export type SecureAuthDb = PostgresJsDatabase<AuthSchema>;

export type EmailProvider = {
  send(input: { to: string; subject: string; html: string; text?: string }): Promise<void>;
};

export type SecureAuthLogger = {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

export type SecureAuthEmailTemplates = {
  verificationEmail?: (input: { appName: string; verifyUrl: string }) => {
    subject: string;
    html: string;
    text?: string;
  };
  passwordReset?: (input: { appName: string; resetUrl: string }) => {
    subject: string;
    html: string;
    text?: string;
  };
};

export type SecureAuthConfig = {
  db: SecureAuthDb;
  app: {
    name: string;
    slug: string;
    baseUrl: string;
  };
  auth: {
    afterLoginPath: string;
    afterLogoutPath: string;
    requireEmailVerificationBeforeSignIn: boolean;
    nextAuthSecret: string;
    twoFactorEncryptionKey: string;
  };
  accountPolicy?: {
    sendVerificationOnRegister: boolean;
    requireEmailVerificationBeforeSignIn: boolean;
  };
  passwordPolicy?: PasswordPolicyConfig;
  sessions?: {
    maxAgeSeconds?: number;
    lastUsedUpdateIntervalSeconds?: number;
  };
  rateLimit?: {
    store: "memory" | "postgres";
  };
  server?: {
    /** When true, auth cookies use the Secure flag. Set from consumer env (e.g. NODE_ENV). */
    cookieSecure?: boolean;
  };
  debug?: {
    authTrace?: boolean;
  };
  oauth?: {
    google?: { clientId: string; clientSecret: string };
    apple?: { clientId: string; clientSecret: string };
    microsoft?: {
      clientId: string;
      clientSecret: string;
      tenantId?: string;
    };
  };
  email: {
    from: string;
    provider: EmailProvider;
    templates?: SecureAuthEmailTemplates;
  };
  webauthn: {
    rpId: string;
    rpName: string;
    origin: string;
  };
  ui?: {
    brand?: {
      name?: string;
      logo?: ReactNode;
    };
    paths?: {
      home?: string;
      login?: string;
      register?: string;
      forgotPassword?: string;
      resetPassword?: string;
      checkEmail?: string;
      verifyEmail?: string;
      loginTwoFactor?: string;
      loginComplete?: string;
      accountDeleted?: string;
      account?: string;
      accountSettings?: string;
      security?: string;
      securitySettings?: string;
      sessions?: string;
      sessionsSettings?: string;
    };
    messages?: Record<string, string>;
    cssVariables?: Record<string, string>;
  };
};

export type SecureAuthServices = {
  readonly config: SecureAuthConfig;
  readonly db: SecureAuthDb;
  readonly ctx: SecureAuthContext;
  readonly repos: SecureAuthRepositories;
  readonly rateLimit: RateLimitApi;
  readonly runInTransaction: RunInTransaction;
  readonly authLoginService: ReturnType<typeof createAuthLoginService>;
  readonly authService: ReturnType<typeof createAuthService>;
  readonly accountAuthService: ReturnType<typeof createAccountAuthService>;
  readonly accountService: ReturnType<typeof createAccountService>;
  readonly accountSessionService: ReturnType<typeof createAccountSessionService>;
  readonly twoFactorService: ReturnType<typeof createTwoFactorService>;
  readonly passkeyLoginService: ReturnType<typeof createPasskeyLoginService>;
  readonly passkeyAccountService: ReturnType<typeof createPasskeyAccountService>;
  readonly getAuthOptions: () => NextAuthOptions;
};
