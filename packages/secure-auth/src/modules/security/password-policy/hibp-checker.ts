import { createHash } from "node:crypto";
import { safeLogger } from "@/modules/security/logger/index";
import type { SecureAuthConfig } from "@/core/types";
import { mergePasswordPolicy } from "./password-policy-core";

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range";
const HIBP_TIMEOUT_MS = 3000;

export const BREACHED_PASSWORD_ERROR =
  "This password has appeared in a data breach. Please choose a different password.";

export function isBreachedPasswordCheckEnabled(config?: SecureAuthConfig): boolean {
  const policy = mergePasswordPolicy(config?.passwordPolicy);
  return policy.checkBreachedPasswords !== false;
}

export async function checkPasswordBreached(
  password: string,
  config?: SecureAuthConfig
): Promise<boolean> {
  if (!isBreachedPasswordCheckEnabled(config)) {
    return false;
  }

  try {
    const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS);

    try {
      const response = await fetch(`${HIBP_RANGE_URL}/${prefix}`, {
        signal: controller.signal,
        headers: {
          "Add-Padding": "true",
        },
      });

      if (!response.ok) {
        safeLogger.warn("HIBP password check failed", { status: response.status });
        return false;
      }

      const body = await response.text();
      return body.split("\n").some((line) => {
        const [hashSuffix] = line.trim().split(":");
        return hashSuffix?.toUpperCase() === suffix;
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    safeLogger.warn("HIBP password check unavailable", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}
