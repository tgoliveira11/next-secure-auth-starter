import type { SecureAuthConfig } from "@/core/types";
import type { CaptchaFlow } from "./constants.js";

export type ResolvedCaptchaConfig = {
  enabled: boolean;
  provider: "turnstile";
  siteKey: string;
  secretKey: string;
  pages: {
    register: boolean;
    login: boolean;
  };
};

export type PublicCaptchaConfig = {
  provider: "turnstile";
  siteKey: string;
  pages: {
    register: boolean;
    login: boolean;
  };
};

const DEFAULT_PAGES = { register: false, login: false };

export function resolveCaptchaConfig(config: SecureAuthConfig): ResolvedCaptchaConfig {
  const captcha = config.captcha;
  return {
    enabled: captcha?.enabled === true,
    provider: "turnstile",
    siteKey: captcha?.siteKey?.trim() ?? "",
    secretKey: captcha?.secretKey?.trim() ?? "",
    pages: {
      register: captcha?.pages?.register === true,
      login: captcha?.pages?.login === true,
    },
  };
}

export function isCaptchaRequiredForFlow(
  config: SecureAuthConfig,
  flow: CaptchaFlow
): boolean {
  const resolved = resolveCaptchaConfig(config);
  if (!resolved.enabled) return false;
  return flow === "register" ? resolved.pages.register : resolved.pages.login;
}

export function buildPublicCaptchaConfig(
  config: SecureAuthConfig
): PublicCaptchaConfig | undefined {
  const resolved = resolveCaptchaConfig(config);
  if (!resolved.enabled || !resolved.siteKey) return undefined;
  if (!resolved.pages.register && !resolved.pages.login) return undefined;

  return {
    provider: "turnstile",
    siteKey: resolved.siteKey,
    pages: { ...resolved.pages },
  };
}

export function validateCaptchaConfig(config: SecureAuthConfig): void {
  const resolved = resolveCaptchaConfig(config);
  if (!resolved.enabled) return;

  if (!resolved.siteKey || !resolved.secretKey) {
    throw new Error(
      "@tgoliveira/secure-auth: captcha.enabled requires captcha.siteKey and captcha.secretKey in createSecureAuth(config)."
    );
  }
}

export function defaultCaptchaPages() {
  return { ...DEFAULT_PAGES };
}
