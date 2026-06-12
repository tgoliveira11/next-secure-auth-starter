import { getSecureAuthConfig } from "./secure-auth-runtime.js";

export function getAppSlug(): string {
  return getSecureAuthConfig().app.slug;
}

export function getAppName(): string {
  return getSecureAuthConfig().app.name;
}

export function requireNextAuthSecret(): string {
  const secret = getSecureAuthConfig().auth.nextAuthSecret;
  if (!secret) {
    throw new Error(
      "@tgoliveira/secure-auth: auth.nextAuthSecret is required in createSecureAuth(config)."
    );
  }
  return secret;
}

export function requireTwoFactorEncryptionKey(): string {
  const key = getSecureAuthConfig().auth.twoFactorEncryptionKey;
  if (!key) {
    throw new Error(
      "@tgoliveira/secure-auth: auth.twoFactorEncryptionKey is required in createSecureAuth(config)."
    );
  }
  return key;
}