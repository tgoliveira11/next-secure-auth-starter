import { generateSecret, generateURI, verify } from "otplib";
import { getTwoFactorIssuer } from "@/modules/two-factor/lib/constants";

export function generateTotpSecret(): string {
  return generateSecret();
}

export function buildOtpAuthUri(email: string, secret: string): string {
  return generateURI({
    issuer: getTwoFactorIssuer(),
    label: email,
    secret,
  });
}

export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  const normalized = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }

  const result = await verify({ token: normalized, secret });
  return result.valid === true;
}