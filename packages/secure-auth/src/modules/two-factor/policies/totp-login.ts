export type AccountLoginMethod = "passkey" | "credentials" | "oauth";

/**
 * Every supported primary sign-in method requires TOTP when account 2FA is enabled.
 */
export function requiresTotpAfterLogin(
  _method: AccountLoginMethod,
  twoFactorEnabled: boolean
): boolean {
  return twoFactorEnabled;
}
