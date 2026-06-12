/** Cookie and storage key names derived from the consuming app's slug. */
export function buildLoginPendingTokenCookieName(appSlug: string): string {
  return `${appSlug}-login-pending`;
}

export function buildTwoFactorLoginChallengeCookieName(appSlug: string): string {
  return `${appSlug}-2fa-challenge`;
}

export function buildPasskeyLoginUserIdKey(appSlug: string): string {
  return `${appSlug}-passkey-login-user-id`;
}

export function buildPasskeyLoginCredentialIdKey(appSlug: string): string {
  return `${appSlug}-passkey-login-credential-id`;
}

export function buildPasskeyLoginUserIdCookie(appSlug: string): string {
  return `${appSlug}-passkey-login-user-id`;
}

export function buildPasskeyLoginCredentialIdCookie(appSlug: string): string {
  return `${appSlug}-passkey-login-credential-id`;
}