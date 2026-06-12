import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ReactNode } from "react";
import type { AuthSchema } from "../drizzle/schema.js";

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
      login?: string;
      register?: string;
      account?: string;
      security?: string;
    };
    messages?: Record<string, string>;
    cssVariables?: Record<string, string>;
  };
};

export type SecureAuthServices = {
  readonly config: SecureAuthConfig;
  readonly db: SecureAuthDb;
  readonly authLoginService: typeof import("../modules/auth/services/auth-login-service.js").authLoginService;
  readonly authService: typeof import("../modules/auth/services/auth-service.js").authService;
  readonly accountAuthService: typeof import("../modules/account/services/account-auth-service.js").accountAuthService;
  readonly accountService: typeof import("../modules/account/services/account-service.js").accountService;
  readonly accountSessionService: typeof import("../modules/sessions/services/account-session-service.js").accountSessionService;
  readonly twoFactorService: typeof import("../modules/two-factor/services/two-factor-service.js").twoFactorService;
  readonly passkeyLoginService: typeof import("../modules/passkeys/services/passkey-login-service.js").passkeyLoginService;
  readonly passkeyAccountService: typeof import("../modules/passkeys/services/passkey-account-service.js").passkeyAccountService;
};
