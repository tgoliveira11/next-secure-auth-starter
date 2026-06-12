import "server-only";
import { createSecureAuth } from "@tgoliveira/secure-auth/next";
import type { EmailProvider } from "@tgoliveira/secure-auth/email";
import { db } from "@/lib/db";

const emailProvider: EmailProvider = {
  async send(input) {
    const { sendEmail } = await import("@/modules/email/core/send-email");
    await sendEmail({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? "",
    });
  },
};

const appName = process.env.APP_NAME ?? "Next Secure Auth Starter";

function readOAuth(
  clientId: string | undefined,
  clientSecret: string | undefined
): { clientId: string; clientSecret: string } | undefined {
  if (clientId && clientSecret) {
    return { clientId, clientSecret };
  }
  return undefined;
}

const microsoftClientId =
  process.env.AUTH_AZURE_AD_ID ?? process.env.AUTH_MICROSOFT_ID;
const microsoftClientSecret =
  process.env.AUTH_AZURE_AD_SECRET ?? process.env.AUTH_MICROSOFT_SECRET;

export const secureAuth = createSecureAuth({
  db,
  app: {
    name: appName,
    slug: process.env.APP_SLUG ?? "next-secure-auth-starter",
    baseUrl: process.env.APP_BASE_URL ?? "http://localhost:3001",
  },
  auth: {
    afterLoginPath: "/dashboard",
    afterLogoutPath: "/login",
    requireEmailVerificationBeforeSignIn:
      process.env.EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN === "true",
    nextAuthSecret: process.env.NEXTAUTH_SECRET ?? "",
    twoFactorEncryptionKey: process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY ?? "",
  },
  accountPolicy: {
    sendVerificationOnRegister: process.env.EMAIL_VERIFICATION_SEND_ON_REGISTER !== "false",
    requireEmailVerificationBeforeSignIn:
      process.env.EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN === "true",
  },
  oauth: {
    google: readOAuth(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET),
    apple: readOAuth(process.env.APPLE_CLIENT_ID, process.env.APPLE_CLIENT_SECRET),
    microsoft:
      microsoftClientId && microsoftClientSecret
        ? {
            clientId: microsoftClientId,
            clientSecret: microsoftClientSecret,
            tenantId:
              process.env.AUTH_AZURE_AD_TENANT_ID ??
              process.env.AUTH_MICROSOFT_TENANT_ID ??
              "common",
          }
        : undefined,
  },
  email: {
    from: process.env.EMAIL_FROM ?? `${appName} <noreply@localhost>`,
    provider: emailProvider,
  },
  webauthn: {
    rpId: process.env.WEBAUTHN_RP_ID ?? "localhost",
    rpName: appName,
    origin: process.env.WEBAUTHN_ORIGIN ?? process.env.APP_BASE_URL ?? "http://localhost:3001",
  },
  ui: {
    brand: { name: appName },
    paths: {
      login: "/login",
      register: "/register",
      account: "/settings/account",
      security: "/settings/security",
    },
  },
});
