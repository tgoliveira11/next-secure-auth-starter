import type { SecureAuthConfig } from "@tgoliveira/secure-auth";
import type { PasswordPolicyEnforcement } from "@tgoliveira/secure-auth/client/password-policy";
import {
  readBooleanEnv,
  readEnumEnv,
  readEnv,
  readFirstEnv,
  readNumberEnv,
  readOAuthPair,
} from "./parse";

const PASSWORD_ENFORCEMENT_VALUES = ["off", "warn", "enforce"] as const;
const PASSWORD_STRENGTH_POSITION_VALUES = ["above", "below"] as const;
const RATE_LIMIT_STORE_VALUES = ["memory", "postgres"] as const;

export type ConsumerDemoAppEnvDefaults = {
  appName: string;
  appSlug: string;
  baseUrl: string;
  afterLoginPath?: string;
  afterLogoutPath?: string;
};

export type SecureAuthEnvSlice = Pick<
  SecureAuthConfig,
  | "app"
  | "auth"
  | "accountPolicy"
  | "passwordPolicy"
  | "sessions"
  | "rateLimit"
  | "server"
  | "debug"
  | "security"
  | "oauth"
  | "webauthn"
  | "captcha"
  | "ui"
  | "admin"
  | "accountLockout"
  | "invites"
  | "apiKeys"
  | "profile"
>;

/** Maps app-owned environment variables to `createSecureAuth(config)` fields. */
export function buildSecureAuthConfigFromEnv(
  defaults: ConsumerDemoAppEnvDefaults,
  env: NodeJS.ProcessEnv = process.env
): SecureAuthEnvSlice {
  const appName = readEnv(env, "APP_NAME") ?? defaults.appName;
  const appSlug = readEnv(env, "APP_SLUG") ?? defaults.appSlug;
  const baseUrl =
    readFirstEnv(env, ["APP_BASE_URL", "NEXTAUTH_URL"]) ?? defaults.baseUrl;

  const requireEmailVerification = readBooleanEnv(
    env,
    ["EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN"],
    false
  );

  const passwordEnforcement = readEnumEnv<PasswordPolicyEnforcement>(
    env,
    ["AUTH_PASSWORD_POLICY_ENFORCEMENT", "PASSWORD_POLICY_ENFORCEMENT"],
    PASSWORD_ENFORCEMENT_VALUES,
    "warn"
  );

  const passwordStrengthPosition = readEnumEnv(
    env,
    ["AUTH_PASSWORD_STRENGTH_POSITION"],
    PASSWORD_STRENGTH_POSITION_VALUES,
    "above"
  );

  const rateLimitStore = readEnumEnv(
    env,
    ["AUTH_RATE_LIMIT_STORE", "RATE_LIMIT_STORE"],
    RATE_LIMIT_STORE_VALUES,
    "memory"
  );

  const cookieSecureFromEnv = readFirstEnv(env, ["AUTH_COOKIE_SECURE", "COOKIE_SECURE"]);
  const cookieSecure =
    cookieSecureFromEnv === undefined
      ? env.NODE_ENV === "production"
      : readBooleanEnv(env, ["AUTH_COOKIE_SECURE", "COOKIE_SECURE"], false);

  const microsoftOAuth = readOAuthPair(
    env,
    ["AUTH_MICROSOFT_CLIENT_ID", "AUTH_MICROSOFT_ID", "AUTH_AZURE_AD_ID"],
    ["AUTH_MICROSOFT_CLIENT_SECRET", "AUTH_MICROSOFT_SECRET", "AUTH_AZURE_AD_SECRET"]
  );

  const afterLoginPath =
    readEnv(env, "AUTH_AFTER_LOGIN_PATH") ?? defaults.afterLoginPath ?? "/dashboard";

  return {
    app: {
      name: appName,
      slug: appSlug,
      baseUrl,
    },
    auth: {
      afterLoginPath,
      afterLogoutPath: readEnv(env, "AUTH_AFTER_LOGOUT_PATH") ?? defaults.afterLogoutPath ?? "/login",
      requireEmailVerificationBeforeSignIn: requireEmailVerification,
      nextAuthSecret: readEnv(env, "NEXTAUTH_SECRET") ?? "",
      twoFactorEncryptionKey: readEnv(env, "TWO_FACTOR_SECRET_ENCRYPTION_KEY") ?? "",
      redirectAuthenticatedFromGuestPages: readBooleanEnv(
        env,
        ["AUTH_REDIRECT_AUTHENTICATED_FROM_GUEST_PAGES"],
        true
      ),
      authenticatedRedirectPath:
        readEnv(env, "AUTH_AUTHENTICATED_REDIRECT_PATH") ?? afterLoginPath,
      magicLink: {
        enabled: readBooleanEnv(env, ["AUTH_MAGIC_LINK_ENABLED"], false),
      },
      securityNotifications: {
        enabled: readBooleanEnv(env, ["AUTH_SECURITY_NOTIFICATIONS_ENABLED"], false),
      },
    },
    admin: {
      enabled: readBooleanEnv(env, ["AUTH_ADMIN_ENABLED"], false),
      path: readEnv(env, "AUTH_ADMIN_PATH") ?? "/admin",
      bootstrapEmail: readEnv(env, "ADMIN_BOOTSTRAP_EMAIL"),
      configCacheTtlSeconds: readNumberEnv(env, ["AUTH_ADMIN_CONFIG_CACHE_TTL_SECONDS"], 60, { min: 0 }),
    },
    accountLockout: {
      enabled: readBooleanEnv(env, ["AUTH_ACCOUNT_LOCKOUT_ENABLED"], false),
    },
    invites: {
      enabled: readBooleanEnv(env, ["AUTH_INVITES_ENABLED"], false),
      requireApproval: readBooleanEnv(env, ["AUTH_INVITES_REQUIRE_APPROVAL"], false),
      requireInviteCode: readBooleanEnv(env, ["AUTH_INVITES_REQUIRE_CODE"], false),
      defaultQuotaPerUser: readNumberEnv(env, ["AUTH_INVITES_DEFAULT_QUOTA"], 0, { min: 0 }),
      codeExpiryDays: readNumberEnv(env, ["AUTH_INVITES_CODE_EXPIRY_DAYS"], 30, { min: 1 }),
    },
    apiKeys: {
      enabled: readBooleanEnv(env, ["AUTH_API_KEYS_ENABLED"], false),
    },
    profile: {
      enabled: readBooleanEnv(env, ["AUTH_PROFILE_ENABLED"], false),
    },
    accountPolicy: {
      sendVerificationOnRegister: readBooleanEnv(
        env,
        ["EMAIL_VERIFICATION_SEND_ON_REGISTER"],
        true
      ),
      requireEmailVerificationBeforeSignIn: requireEmailVerification,
      requireEmailVerificationForAccountApis: readBooleanEnv(
        env,
        ["EMAIL_VERIFICATION_REQUIRE_FOR_ACCOUNT_APIS"],
        true
      ),
    },
    passwordPolicy: {
      enforcement: passwordEnforcement,
      minLength: readNumberEnv(env, ["AUTH_PASSWORD_MIN_LENGTH", "PASSWORD_MIN_LENGTH"], 12, {
        min: 1,
        max: 128,
      }),
      requireUppercase: readBooleanEnv(
        env,
        ["AUTH_PASSWORD_REQUIRE_UPPERCASE", "PASSWORD_REQUIRE_UPPERCASE"],
        false
      ),
      requireLowercase: readBooleanEnv(
        env,
        ["AUTH_PASSWORD_REQUIRE_LOWERCASE", "PASSWORD_REQUIRE_LOWERCASE"],
        false
      ),
      requireNumber: readBooleanEnv(
        env,
        ["AUTH_PASSWORD_REQUIRE_NUMBER", "PASSWORD_REQUIRE_NUMBER"],
        false
      ),
      requireSymbol: readBooleanEnv(
        env,
        ["AUTH_PASSWORD_REQUIRE_SYMBOL", "PASSWORD_REQUIRE_SYMBOL"],
        false
      ),
      blockCommonPasswords: readBooleanEnv(
        env,
        ["AUTH_PASSWORD_BLOCK_COMMON_PASSWORDS", "PASSWORD_BLOCK_COMMON_PASSWORDS"],
        true
      ),
      checkBreachedPasswords: readBooleanEnv(
        env,
        ["AUTH_PASSWORD_HIBP_ENABLED", "AUTH_PASSWORD_CHECK_BREACHED"],
        false
      ),
      minScore: readNumberEnv(env, ["AUTH_PASSWORD_MIN_SCORE", "PASSWORD_MIN_SCORE"], 2, {
        min: 0,
        max: 4,
      }),
    },
    sessions: {
      maxAgeSeconds: readNumberEnv(env, ["AUTH_SESSION_MAX_AGE_SECONDS"], 30 * 24 * 60 * 60, {
        min: 60,
      }),
      lastUsedUpdateIntervalSeconds: readNumberEnv(
        env,
        [
          "AUTH_SESSION_LAST_USED_UPDATE_SECONDS",
          "AUTH_SESSION_PING_INTERVAL_SECONDS",
          "SESSION_LAST_USED_UPDATE_INTERVAL_SECONDS",
        ],
        300,
        { min: 30 }
      ),
      singleActiveSession: readBooleanEnv(env, ["AUTH_SINGLE_ACTIVE_SESSION"], false),
      revocationPollIntervalSeconds: readNumberEnv(
        env,
        ["AUTH_SESSION_REVOCATION_POLL_SECONDS"],
        10,
        { min: 5, max: 300 }
      ),
    },
    rateLimit: {
      store: rateLimitStore,
    },
    server: {
      cookieSecure,
    },
    debug: {
      authTrace: readBooleanEnv(env, ["AUTH_TRACE", "AUTH_DEBUG_TRACE"], false),
      exposeTraceRoute: readBooleanEnv(env, ["AUTH_DEBUG_EXPOSE_TRACE_ROUTE"], false),
    },
    security: {
      sameOriginProtection: {
        enabled: readBooleanEnv(env, ["AUTH_SAME_ORIGIN_PROTECTION_ENABLED"], true),
        allowedOrigins: readEnv(env, "AUTH_ALLOWED_ORIGINS")
          ?.split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      },
    },
    oauth: {
      google: readOAuthPair(
        env,
        ["AUTH_GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID"],
        ["AUTH_GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"]
      ),
      apple: readOAuthPair(
        env,
        ["AUTH_APPLE_CLIENT_ID", "APPLE_CLIENT_ID"],
        ["AUTH_APPLE_CLIENT_SECRET", "APPLE_CLIENT_SECRET"]
      ),
      github: readOAuthPair(
        env,
        ["AUTH_GITHUB_CLIENT_ID", "GITHUB_CLIENT_ID"],
        ["AUTH_GITHUB_CLIENT_SECRET", "GITHUB_CLIENT_SECRET"]
      ),
      microsoft: microsoftOAuth
        ? {
            ...microsoftOAuth,
            tenantId:
              readFirstEnv(env, ["AUTH_MICROSOFT_TENANT_ID", "AUTH_AZURE_AD_TENANT_ID"]) ??
              "common",
          }
        : undefined,
    },
    webauthn: {
      rpId: readEnv(env, "WEBAUTHN_RP_ID") ?? "localhost",
      rpName: readEnv(env, "WEBAUTHN_RP_NAME") ?? appName,
      origin: readFirstEnv(env, ["WEBAUTHN_ORIGIN", "APP_BASE_URL", "NEXTAUTH_URL"]) ?? baseUrl,
    },
    captcha: {
      enabled: readBooleanEnv(env, ["AUTH_CAPTCHA_ENABLED"], false),
      provider: "turnstile",
      siteKey: readEnv(env, "AUTH_CAPTCHA_TURNSTILE_SITE_KEY"),
      secretKey: readEnv(env, "AUTH_CAPTCHA_TURNSTILE_SECRET_KEY"),
      pages: {
        register: readBooleanEnv(env, ["AUTH_CAPTCHA_REGISTER_ENABLED"], false),
        login: readBooleanEnv(env, ["AUTH_CAPTCHA_LOGIN_ENABLED"], false),
      },
    },
    ui: {
      brand: { name: appName },
      passwordStrength: {
        position: passwordStrengthPosition,
      },
    },
  };
}
