import "server-only";
import { createSecureAuth } from "@tgoliveira/secure-auth/next";
import { db } from "@/lib/db";
import { consoleEmailProvider } from "@/lib/email-provider";

const appName = "Consumer Demo";
const appSlug = "consumer-demo";
const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3002";

function readOAuth(
  clientId: string | undefined,
  clientSecret: string | undefined
): { clientId: string; clientSecret: string } | undefined {
  if (clientId && clientSecret) {
    return { clientId, clientSecret };
  }
  return undefined;
}

export const secureAuth = createSecureAuth({
  db,
  app: {
    name: appName,
    slug: appSlug,
    baseUrl,
  },
  auth: {
    afterLoginPath: "/dashboard",
    afterLogoutPath: "/login",
    requireEmailVerificationBeforeSignIn: false,
    nextAuthSecret: process.env.NEXTAUTH_SECRET ?? "",
    twoFactorEncryptionKey: process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY ?? "",
  },
  accountPolicy: {
    sendVerificationOnRegister: true,
    requireEmailVerificationBeforeSignIn: false,
  },
  passwordPolicy: {
    enforcement: "warn",
    minLength: 12,
    requireUppercase: false,
    requireLowercase: false,
    requireNumber: false,
    requireSymbol: false,
    blockCommonPasswords: true,
    minScore: 2,
  },
  sessions: {
    maxAgeSeconds: 30 * 24 * 60 * 60,
    lastUsedUpdateIntervalSeconds: 300,
  },
  rateLimit: {
    store: "memory",
  },
  server: {
    cookieSecure: process.env.COOKIE_SECURE === "true",
  },
  debug: {
    authTrace: process.env.AUTH_TRACE === "true",
  },
  oauth: {
    google: readOAuth(process.env.AUTH_GOOGLE_CLIENT_ID, process.env.AUTH_GOOGLE_CLIENT_SECRET),
    apple: readOAuth(process.env.AUTH_APPLE_CLIENT_ID, process.env.AUTH_APPLE_CLIENT_SECRET),
    microsoft: readOAuth(
      process.env.AUTH_MICROSOFT_CLIENT_ID,
      process.env.AUTH_MICROSOFT_CLIENT_SECRET
    )
      ? {
          clientId: process.env.AUTH_MICROSOFT_CLIENT_ID!,
          clientSecret: process.env.AUTH_MICROSOFT_CLIENT_SECRET!,
          tenantId: process.env.AUTH_MICROSOFT_TENANT_ID ?? "common",
        }
      : undefined,
  },
  email: {
    from: `${appName} <noreply@localhost>`,
    provider: consoleEmailProvider,
  },
  webauthn: {
    rpId: process.env.WEBAUTHN_RP_ID ?? "localhost",
    rpName: process.env.WEBAUTHN_RP_NAME ?? appName,
    origin: process.env.WEBAUTHN_ORIGIN ?? baseUrl,
  },
  ui: {
    brand: { name: appName },
    paths: {
      login: "/login",
      register: "/register",
      forgotPassword: "/forgot-password",
      resetPassword: "/reset-password",
      verifyEmail: "/verify-email",
      checkEmail: "/check-email",
      loginTwoFactor: "/login/2fa",
      loginComplete: "/login/complete",
      account: "/settings/account",
      security: "/settings/security",
      sessions: "/settings/sessions",
      accountDeleted: "/account-deleted",
    },
    messages: {
      loginTitle: "Sign in to Consumer Demo",
      registerTitle: "Create your Consumer Demo account",
      securitySettingsTitle: "Consumer Demo security",
      sessionsSettingsTitle: "Active Consumer Demo sessions",
      dashboardTitle: "Consumer Demo dashboard",
    },
  },
});
