import type { Session } from "next-auth";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export type JwtAuthState = {
  sub?: string;
  email?: string;
  twoFactorVerified?: boolean;
  twoFactorPending?: boolean;
  emailVerificationRequired?: boolean;
  sessionInvalidated?: boolean;
};

export function isFullyAuthenticatedSession(
  status: SessionStatus,
  session: Session | null | undefined
): boolean {
  if (status !== "authenticated" || !session?.user?.id) {
    return false;
  }
  if (session.twoFactorPending === true) {
    return false;
  }
  if (session.twoFactorVerified === false) {
    return false;
  }
  if (session.emailVerificationRequired === true) {
    return false;
  }
  return true;
}

export function hasPendingTwoFactorSession(
  status: SessionStatus,
  session: Session | null | undefined
): boolean {
  return status === "authenticated" && session?.twoFactorPending === true;
}

export function hasEmailVerificationRequiredSession(
  status: SessionStatus,
  session: Session | null | undefined
): boolean {
  return status === "authenticated" && session?.emailVerificationRequired === true;
}

export function isFullyAuthenticatedJwt(token: JwtAuthState | null | undefined): boolean {
  if (!token?.sub || token.sessionInvalidated) {
    return false;
  }
  if (token.twoFactorPending === true && token.twoFactorVerified === false) {
    return false;
  }
  if (token.emailVerificationRequired === true) {
    return false;
  }
  return true;
}

export function hasPendingTwoFactorJwt(token: JwtAuthState | null | undefined): boolean {
  return token?.twoFactorPending === true && token.twoFactorVerified === false;
}

export function hasEmailVerificationRequiredJwt(token: JwtAuthState | null | undefined): boolean {
  return token?.emailVerificationRequired === true;
}
