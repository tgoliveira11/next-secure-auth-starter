import {
  buildPasskeyLoginCredentialIdCookie,
  buildPasskeyLoginCredentialIdKey,
  buildPasskeyLoginUserIdCookie,
  buildPasskeyLoginUserIdKey,
} from "@/modules/auth/lib/auth-cookie-names.js";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

export type PasskeyLoginHint = {
  userId?: string;
  credentialId?: string;
};

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return undefined;
  const value = decodeURIComponent(match[1]);
  return value.length > 0 ? value : undefined;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

function clearCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
}

export function getPasskeyLoginHint(appSlug: string): PasskeyLoginHint | null {
  if (typeof window === "undefined") return null;

  const userIdKey = buildPasskeyLoginUserIdKey(appSlug);
  const credentialIdKey = buildPasskeyLoginCredentialIdKey(appSlug);
  const userIdCookie = buildPasskeyLoginUserIdCookie(appSlug);
  const credentialIdCookie = buildPasskeyLoginCredentialIdCookie(appSlug);

  const userId = localStorage.getItem(userIdKey) ?? readCookie(userIdCookie);
  const credentialId = localStorage.getItem(credentialIdKey) ?? readCookie(credentialIdCookie);

  if (!userId && !credentialId) return null;
  return { userId: userId ?? undefined, credentialId: credentialId ?? undefined };
}

export function setPasskeyLoginHint(appSlug: string, hint: PasskeyLoginHint): void {
  if (typeof window === "undefined") return;

  const userIdKey = buildPasskeyLoginUserIdKey(appSlug);
  const credentialIdKey = buildPasskeyLoginCredentialIdKey(appSlug);
  const userIdCookie = buildPasskeyLoginUserIdCookie(appSlug);
  const credentialIdCookie = buildPasskeyLoginCredentialIdCookie(appSlug);

  if (hint.userId) {
    localStorage.setItem(userIdKey, hint.userId);
    writeCookie(userIdCookie, hint.userId);
  } else {
    localStorage.removeItem(userIdKey);
    clearCookie(userIdCookie);
  }

  if (hint.credentialId) {
    localStorage.setItem(credentialIdKey, hint.credentialId);
    writeCookie(credentialIdCookie, hint.credentialId);
  } else {
    localStorage.removeItem(credentialIdKey);
    clearCookie(credentialIdCookie);
  }
}

export function clearPasskeyLoginHint(appSlug: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(buildPasskeyLoginUserIdKey(appSlug));
  localStorage.removeItem(buildPasskeyLoginCredentialIdKey(appSlug));
  clearCookie(buildPasskeyLoginUserIdCookie(appSlug));
  clearCookie(buildPasskeyLoginCredentialIdCookie(appSlug));
}