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
import type { createPasskeyGrantService } from "../modules/passkeys/services/passkey-grant-service.js";
import type { createMagicLinkService } from "../modules/auth/services/magic-link-service.js";
import type { createSecurityNotificationService } from "../modules/security/notifications/security-notification-service.js";
import type { createAdminService } from "../modules/admin/services/admin-service.js";
import type { createLockoutService } from "../modules/admin/services/lockout-service.js";
import type { createInviteService } from "../modules/admin/services/invite-service.js";
import type { createApiKeyService } from "../modules/admin/services/api-key-service.js";
import type { createConfigOverrideService } from "../modules/admin/services/config-override-service.js";
import type { createProfileService } from "../modules/account/services/profile-service.js";
import type { createUserPreferencesService } from "../modules/preferences/services/user-preferences-service.js";

export type SecureAuthDb = PostgresJsDatabase<AuthSchema>;

export type EmailProvider = {
  send(input: { to: string; subject: string; html: string; text?: string }): Promise<void>;
};

export type SecureAuthLogger = {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

export type SecureAuthJsonValue =
  | string
  | number
  | boolean
  | null
  | SecureAuthJsonValue[]
  | { [key: string]: SecureAuthJsonValue };

/**
 * Server-only context for adding JSON-safe extension inputs to an account passkey login.
 * `userId` and `credentialIds` are never included in the public options response by secure-auth.
 */
export type PasskeyLoginAuthenticationExtensionsContext = {
  userId: string;
  credentialIds: readonly string[];
};

export type PasskeyLoginAuthenticationExtensions = Record<string, SecureAuthJsonValue>;

export type WebAuthnOriginAliasPolicy = "apex-www" | "none";

export type PortableVaultGrantPrivateJwk = {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
  d: string;
  kid: string;
  alg?: "ES256";
  use?: "sig";
};

export type PortableVaultBrokerReceiptPublicJwk = {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
  kid: string;
  alg?: "ES256";
  use?: "sig";
};

export type PortableVaultGrantsEnabledConfig = {
  enabled: true;
  /** Stable issuer identifier for this secure-auth deployment. */
  issuer: string;
  /** Stable app registration id understood by the broker. */
  appId: string;
  /** Exact URL audience configured by the portable vault broker. */
  audience: string;
  /** Grant lifetime in seconds. Defaults to 60; allowed range is 15-120. */
  ttlSeconds?: number;
  /** Base64url-encoded secret of at least 32 bytes for app-scoped opaque subjects. */
  opaqueSubjectKey: string;
  /** Base64url-encoded JSON ES256 private JWK. Keep this value server-only. */
  grantPrivateJwkB64: string;
  /** Exact broker issuer accepted for completion receipts. */
  brokerReceiptIssuer: string;
  /** Base64url-encoded JSON array of active ES256 broker receipt public JWKs. */
  brokerReceiptPublicJwksB64: string;
};

export type PortableVaultGrantsConfig =
  | { enabled?: false }
  | PortableVaultGrantsEnabledConfig;

export type SecureAuthEmailContent = {
  subject: string;
  html: string;
  text?: string;
};

export type SecureAuthEmailTemplates = {
  verificationEmail?: (input: { appName: string; verifyUrl: string }) => SecureAuthEmailContent;
  passwordReset?: (input: { appName: string; resetUrl: string }) => SecureAuthEmailContent;
  magicLink?: (input: { appName: string; magicLinkUrl: string }) => SecureAuthEmailContent;
  newLoginNotification?: (input: {
    appName: string;
    browser?: string;
    platform?: string;
    deviceType?: string;
    ipMasked?: string;
    occurredAt: Date;
  }) => SecureAuthEmailContent;
  passwordChangedNotification?: (input: { appName: string; occurredAt: Date }) => SecureAuthEmailContent;
  twoFactorDisabledNotification?: (input: { appName: string; occurredAt: Date }) => SecureAuthEmailContent;
  accountEmailChangedNotification?: (input: {
    appName: string;
    previousEmail: string;
    newEmail: string;
    occurredAt: Date;
  }) => SecureAuthEmailContent;
  magicLinkUsedNotification?: (input: {
    appName: string;
    browser?: string;
    platform?: string;
    deviceType?: string;
    ipMasked?: string;
    occurredAt: Date;
  }) => SecureAuthEmailContent;
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
    /** Post sign-out redirect. Default: `/` (the app home, not the login page). */
    afterLogoutPath?: string;
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
    /** When true, honor X-Forwarded-For / X-Real-IP for rate limiting. Default: false. */
    trustForwardedHeaders?: boolean;
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
  preferences?: {
    /** Enable per-user key-value preferences. Default: false. */
    enabled?: boolean;
    /** Max keys per user per namespace. Default: 50. */
    maxKeysPerUser?: number;
    /** Max serialized JSON bytes per value. Default: 4096. */
    maxValueBytes?: number;
    /** Extra allowed namespaces beyond app.slug and secure-auth. Default: []. */
    allowedNamespaces?: string[];
    /** Seed keys for `app.slug` when the namespace is empty on first read. */
    defaults?: Record<string, unknown>;
    /** Seed keys per namespace when empty on first read. */
    defaultsByNamespace?: Record<string, Record<string, unknown>>;
  };
  rateLimit?: {
    store: "memory" | "postgres";
  };
  server?: {
    /** When true, auth cookies use the Secure flag. Set from consumer env (e.g. NODE_ENV). */
    cookieSecure?: boolean;
    /**
     * Deployment environment. When `"production"`, in-memory rate limiting is rejected at startup.
     * Set from consumer env (e.g. NODE_ENV).
     */
    environment?: "development" | "test" | "production";
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
    /** Additional explicitly allowed WebAuthn origins. Automatic aliases follow `originAliasPolicy`. */
    origins?: string[];
    /**
     * Controls automatic origin aliases. `"apex-www"` preserves the default apex/www and local
     * loopback aliases. `"none"` accepts only each explicitly configured origin.
     * Default: `"apex-www"`.
     */
    originAliasPolicy?: WebAuthnOriginAliasPolicy;
    /**
     * Optional server-only composition hook for independent browser capabilities that need
     * WebAuthn extension inputs during account passkey login. It runs only after secure-auth has
     * resolved a user and a non-empty sign-in credential allow-list. The callback may add
     * JSON-safe extension inputs, but cannot replace the challenge, RP ID, user-verification
     * policy, or credential allow-list.
     */
    getLoginAuthenticationExtensions?: (
      context: Readonly<PasskeyLoginAuthenticationExtensionsContext>
    ) =>
      | PasskeyLoginAuthenticationExtensions
      | undefined
      | Promise<PasskeyLoginAuthenticationExtensions | undefined>;
    /**
     * Optional, account-session-gated WebAuthn proof grants for an independent portable vault
     * broker. Secure-auth verifies the passkey and signs a key-bound authorization grant; it never
     * receives PRF output, a portable unlock key, or decrypted vault material.
     */
    portableVaultGrants?: PortableVaultGrantsConfig;
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
      loginTwoFactorOauthComplete?: string;
      loginComplete?: string;
      magicLinkVerify?: string;
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
    login?: {
      /**
       * When true, the login page asks for the email address first (with magic link and
       * OAuth options), and only reveals password and passkey sign-in on a second step.
       * Default: false (email, password, passkey and OAuth on a single step).
       */
      twoStep?: boolean;
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
  readonly passkeyGrantService: ReturnType<typeof createPasskeyGrantService>;
  readonly magicLinkService: ReturnType<typeof createMagicLinkService>;
  readonly securityNotificationService: ReturnType<typeof createSecurityNotificationService>;
  readonly adminService: ReturnType<typeof createAdminService>;
  readonly lockoutService: ReturnType<typeof createLockoutService>;
  readonly inviteService: ReturnType<typeof createInviteService>;
  readonly apiKeyService: ReturnType<typeof createApiKeyService>;
  readonly configOverrideService: ReturnType<typeof createConfigOverrideService>;
  readonly profileService: ReturnType<typeof createProfileService>;
  readonly userPreferencesService: ReturnType<typeof createUserPreferencesService>;
  readonly getAuthOptions: () => NextAuthOptions;
};
