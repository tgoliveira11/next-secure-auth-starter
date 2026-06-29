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
import type { createMagicLinkService } from "../modules/auth/services/magic-link-service.js";
import type { createSecurityNotificationService } from "../modules/security/notifications/security-notification-service.js";
import type { createAdminService } from "../modules/admin/services/admin-service.js";

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
    /** Redirect fully authenticated users away from guest auth pages. Default: true. */
    redirectAuthenticatedFromGuestPages?: boolean;
    /** Landing path when redirecting authenticated users from guest pages. Falls back to afterLoginPath. */
    authenticatedRedirectPath?: string;
    magicLink?: {
      /** When true, passwordless email magic link login is enabled. Default: false. */
      enabled?: boolean;
    };
    securityNotifications?: {
      /** When false, security notification emails are suppressed. Default: true. */
      enabled?: boolean;
    };
  };
  accountPolicy?: {
    sendVerificationOnRegister: boolean;
    requireEmailVerificationBeforeSignIn: boolean;
    /** Reject sensitive account APIs when session email is unverified. Default: true. */
    requireEmailVerificationForAccountApis?: boolean;
  };
  security?: {
    sameOriginProtection?: {
      /** Default: true for authenticated mutating package routes. */
      enabled?: boolean;
      /** Extra allowed origins in addition to app.baseUrl and webauthn.origin. */
      allowedOrigins?: string[];
    };
  };
  passwordPolicy?: Partial<PasswordPolicyConfig>;
  sessions?: {
    maxAgeSeconds?: number;
    lastUsedUpdateIntervalSeconds?: number;
    /** When true, each successful login revokes all other active sessions for the user. Default: false. */
    singleActiveSession?: boolean;
    /** Client poll interval (seconds) to sign out browsers whose session was revoked elsewhere. Default: 10 when singleActiveSession is true. */
    revocationPollIntervalSeconds?: number;
  };
  admin?: {
    /** Enable the admin panel. Default: false. */
    enabled?: boolean;
    /** URL path for the admin panel. Default: "/admin". */
    path?: string;
    /**
     * Bootstrap: promote this email to admin role on first server start when no
     * admin exists yet. No-op once at least one admin is in the database.
     */
    bootstrapEmail?: string;
    /** Seconds to cache admin config overrides in memory. Default: 60. 0 = no cache. */
    configCacheTtlSeconds?: number;
  };
  accountLockout?: {
    /** Enable progressive account lockout. Default: false. */
    enabled?: boolean;
    thresholds?: Array<{
      /** Cumulative failed login attempts that trigger this threshold. */
      attempts: number;
      action: "freeze" | "lock";
      /** Required when action = "freeze". Duration in seconds. */
      freezeDurationSeconds?: number;
    }>;
  };
  invites?: {
    /** Enable the invite/waitlist system. Default: false. */
    enabled?: boolean;
    /** New accounts start as "pending" and require admin approval. Default: false. */
    requireApproval?: boolean;
    /** Registration requires a valid invite code. Default: false. */
    requireInviteCode?: boolean;
    /** How many invite codes each approved user gets. Default: 0. */
    defaultQuotaPerUser?: number;
    /** Invite code validity in days. Default: 30. */
    codeExpiryDays?: number;
  };
  apiKeys?: {
    /** Enable machine-to-machine API key auth. Default: false. */
    enabled?: boolean;
    /** Default key expiry in days. null = never. Default: 365. */
    defaultExpiryDays?: number | null;
  };
  profile?: {
    /** Enable user profile (display name, avatar, bio). Default: false. */
    enabled?: boolean;
    /** Allow avatar image uploads (requires uploadHandler). Default: false. */
    allowAvatarUpload?: boolean;
    /** Consumer-provided handler to store avatar files and return a URL. */
    uploadHandler?: (file: Buffer, mimeType: string, userId: string) => Promise<string>;
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
    /** When true with authTrace, exposes GET /api/auth/login/trace. Default: false. */
    exposeTraceRoute?: boolean;
  };
  oauth?: {
    google?: { clientId: string; clientSecret: string };
    apple?: { clientId: string; clientSecret: string };
    github?: { clientId: string; clientSecret: string };
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
    /** Additional allowed WebAuthn origins (optional). Apex/www variants of `origin` are accepted automatically. */
    origins?: string[];
  };
  captcha?: {
    provider?: "turnstile";
    siteKey?: string;
    secretKey?: string;
    enabled?: boolean;
    pages?: {
      register?: boolean;
      login?: boolean;
    };
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
      waitlistPending?: string;
      adminPanel?: string;
    };
    messages?: Record<string, string>;
    cssVariables?: Record<string, string>;
    passwordStrength?: {
      position?: "above" | "below";
    };
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
  readonly magicLinkService: ReturnType<typeof createMagicLinkService>;
  readonly securityNotificationService: ReturnType<typeof createSecurityNotificationService>;
  readonly adminService: ReturnType<typeof createAdminService>;
  readonly getAuthOptions: () => NextAuthOptions;
};
