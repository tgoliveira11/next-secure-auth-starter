import type { SecureAuthConfig } from "@/core/types";
import { CaptchaVerificationError } from "../errors.js";
import type { CaptchaFlow } from "../lib/constants.js";
import {
  isCaptchaRequiredForFlow,
  resolveCaptchaConfig,
} from "../lib/captcha-config.js";
import { TURNSTILE_SITEVERIFY_URL } from "../lib/constants.js";
import { safeLogger } from "@/modules/security/logger/index";

type SiteverifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(input: {
  secretKey: string;
  token: string;
  remoteIp?: string;
}): Promise<boolean> {
  const body = new URLSearchParams();
  body.set("secret", input.secretKey);
  body.set("response", input.token);
  if (input.remoteIp) {
    body.set("remoteip", input.remoteIp);
  }

  let response: Response;
  try {
    response = await fetch(TURNSTILE_SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (error) {
    safeLogger.warn("Turnstile siteverify request failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }

  if (!response.ok) {
    safeLogger.warn("Turnstile siteverify returned non-OK status", {
      status: response.status,
    });
    return false;
  }

  const data = (await response.json().catch(() => null)) as SiteverifyResponse | null;
  if (!data || data.success !== true) {
    safeLogger.warn("Turnstile siteverify rejected token", {
      errorCodes: data?.["error-codes"] ?? [],
    });
    return false;
  }

  return true;
}

export async function verifyCaptcha(input: {
  config: SecureAuthConfig;
  token?: string | null;
  remoteIp?: string;
  action: CaptchaFlow;
}): Promise<void> {
  if (!isCaptchaRequiredForFlow(input.config, input.action)) {
    return;
  }

  const { secretKey } = resolveCaptchaConfig(input.config);
  const token = input.token?.trim();
  if (!token) {
    throw new CaptchaVerificationError();
  }

  const valid = await verifyTurnstileToken({
    secretKey,
    token,
    remoteIp: input.remoteIp,
  });

  if (!valid) {
    throw new CaptchaVerificationError();
  }
}
