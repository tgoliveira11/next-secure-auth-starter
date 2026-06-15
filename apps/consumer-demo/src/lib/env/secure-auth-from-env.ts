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
  | "oauth"
  | "webauthn"
  | "ui"
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

  return {
    app: {
      name: appName,
      slug: appSlug,
      baseUrl,
    },
    auth: {
      afterLoginPath: readEnv(env, "AUTH_AFTER_LOGIN_PATH") ?? defaults.afterLoginPath ?? "/dashboard",
      afterLogoutPath: readEnv(env, "AUTH_AFTER_LOGOUT_PATH") ?? defaults.afterLogoutPath ?? "/login",
      requireEmailVerificationBeforeSignIn: requireEmailVerification,
      nextAuthSecret: readEnv(env, "NEXTAUTH_SECRET") ?? "",
      twoFactorEncryptionKey: readEnv(env, "TWO_FACTOR_SECRET_ENCRYPTION_KEY") ?? "",
    },
    accountPolicy: {
      sendVerificationOnRegister: readBooleanEnv(
        env,
        ["EMAIL_VERIFICATION_SEND_ON_REGISTER"],
        true
      ),
      requireEmailVerificationBeforeSignIn: requireEmailVerification,
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
    ui: {
      brand: { name: appName },
      passwordStrength: {
        position: passwordStrengthPosition,
      },
    },
  };
}
