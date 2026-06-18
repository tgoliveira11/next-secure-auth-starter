import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { SecureAuthConfig } from "../../core/types.js";
import type { PublicAuthRedirectConfig } from "../../core/auth-redirect-config.js";
import { DEFAULT_GUEST_ONLY_PATH_KEYS, type GuestOnlyPathKey } from "../../core/auth-redirect-config.js";
import type { SecureAuthUIPublicConfig } from "../../core/ui-config.js";
import type { AuthPaths } from "../../modules/ui/pages/types.js";
import {
  hasEmailVerificationRequiredJwt,
  hasPendingTwoFactorJwt,
  isFullyAuthenticatedJwt,
  type JwtAuthState,
} from "../../modules/ui/auth-redirect/session-auth-state.js";

export function buildMiddlewareConfig(
  config: SecureAuthConfig,
  uiConfig: SecureAuthUIPublicConfig
): SecureAuthMiddlewareConfig {
  return {
    paths: uiConfig.paths,
    auth: uiConfig.auth,
    nextAuthSecret: config.auth.nextAuthSecret,
    redirectAuthenticatedFromGuestPages: uiConfig.auth.redirectAuthenticatedFromGuestPages,
  };
}

export function buildMiddlewareConfigFromUi(
  uiConfig: SecureAuthUIPublicConfig,
  nextAuthSecret: string
): SecureAuthMiddlewareConfig {
  return {
    paths: uiConfig.paths,
    auth: uiConfig.auth,
    nextAuthSecret,
    redirectAuthenticatedFromGuestPages: uiConfig.auth.redirectAuthenticatedFromGuestPages,
  };
}

export type SecureAuthMiddlewareConfig = {
  paths: Required<AuthPaths>;
  auth: PublicAuthRedirectConfig;
  /** NextAuth secret used by `getToken`. Required for JWT inspection. */
  nextAuthSecret: string;
  /** Guest-only path keys to redirect when fully authenticated. */
  guestOnlyPathKeys?: readonly GuestOnlyPathKey[];
  /** When true, redirect fully authenticated users away from guest routes. */
  redirectAuthenticatedFromGuestPages?: boolean;
  /** Optional trace hook for consumer diagnostics. */
  onTrace?: (event: string, meta?: Record<string, string | boolean | number>) => void;
};

const TWO_FACTOR_ALLOWED_SUFFIXES = [
  "/login",
  "/api/auth",
  "/_next",
  "/icon.svg",
  "/apple-icon",
  "/account-deleted",
] as const;

const EMAIL_VERIFICATION_ALLOWED_SUFFIXES = [
  "/login",
  "/register",
  "/check-email",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/_next",
  "/icon.svg",
  "/apple-icon",
  "/account-deleted",
] as const;

function isAllowedPath(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function rewritePasswordManagerFormPost(request: NextRequest, paths: Required<AuthPaths>) {
  if (request.method !== "POST") {
    return null;
  }

  const pathname = request.nextUrl.pathname;
  if (pathname === paths.login) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/auth/login/start-form";
    return NextResponse.rewrite(url);
  }

  if (pathname === paths.loginTwoFactor) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/auth/login/verify-2fa-form";
    return NextResponse.rewrite(url);
  }

  return null;
}

function resolveGuestOnlyPathnames(
  paths: Required<AuthPaths>,
  keys: readonly GuestOnlyPathKey[]
): string[] {
  return keys.map((key) => paths[key]);
}

function isGuestOnlyPath(pathname: string, guestPaths: string[]): boolean {
  return guestPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function buildTwoFactorAllowedPrefixes(paths: Required<AuthPaths>): string[] {
  return [
    paths.login,
    paths.loginTwoFactor,
    paths.loginComplete,
    ...TWO_FACTOR_ALLOWED_SUFFIXES,
  ];
}

function buildEmailVerificationAllowedPrefixes(paths: Required<AuthPaths>): string[] {
  return [
    paths.login,
    paths.register,
    paths.checkEmail,
    paths.verifyEmail,
    paths.forgotPassword,
    paths.resetPassword,
    ...EMAIL_VERIFICATION_ALLOWED_SUFFIXES,
  ];
}

export function createSecureAuthMiddleware(config: SecureAuthMiddlewareConfig) {
  const guestOnlyPathKeys = config.guestOnlyPathKeys ?? DEFAULT_GUEST_ONLY_PATH_KEYS;
  const guestPaths = resolveGuestOnlyPathnames(config.paths, guestOnlyPathKeys);
  const redirectGuests =
    config.redirectAuthenticatedFromGuestPages ??
    config.auth.redirectAuthenticatedFromGuestPages;
  const authenticatedRedirectPath = config.auth.authenticatedRedirectPath;
  const twoFactorAllowed = buildTwoFactorAllowedPrefixes(config.paths);
  const emailVerificationAllowed = buildEmailVerificationAllowedPrefixes(config.paths);

  return async function secureAuthMiddleware(request: NextRequest) {
    const rewritten = rewritePasswordManagerFormPost(request, config.paths);
    if (rewritten) {
      config.onTrace?.("middleware_rewrite_form_post", { path: request.nextUrl.pathname });
      return rewritten;
    }

    const pathname = request.nextUrl.pathname;

    const token = (await getToken({
      req: request,
      secret: config.nextAuthSecret,
    })) as JwtAuthState | null;

    if (hasPendingTwoFactorJwt(token)) {
      if (!isAllowedPath(pathname, twoFactorAllowed)) {
        config.onTrace?.("middleware_redirect_pending_2fa", { from: pathname });
        const url = request.nextUrl.clone();
        url.pathname = config.paths.loginTwoFactor;
        return NextResponse.redirect(url);
      }
    }

    if (hasEmailVerificationRequiredJwt(token)) {
      if (!isAllowedPath(pathname, emailVerificationAllowed)) {
        config.onTrace?.("middleware_redirect_email_verification", { from: pathname });
        const url = request.nextUrl.clone();
        url.pathname = config.paths.checkEmail;
        if (typeof token?.email === "string" && token.email.length > 0) {
          url.searchParams.set("email", token.email);
        }
        url.searchParams.set("required", "1");
        return NextResponse.redirect(url);
      }
    }

    if (redirectGuests && isFullyAuthenticatedJwt(token)) {
      if (isGuestOnlyPath(pathname, guestPaths)) {
        config.onTrace?.("middleware_redirect_authenticated_guest", { from: pathname });
        const url = request.nextUrl.clone();
        url.pathname = authenticatedRedirectPath;
        return NextResponse.redirect(url);
      }

      if (pathname === config.paths.loginComplete) {
        config.onTrace?.("middleware_redirect_authenticated_login_complete", { from: pathname });
        const url = request.nextUrl.clone();
        url.pathname = authenticatedRedirectPath;
        return NextResponse.redirect(url);
      }

      if (pathname === config.paths.loginTwoFactor) {
        config.onTrace?.("middleware_redirect_authenticated_2fa", { from: pathname });
        const url = request.nextUrl.clone();
        url.pathname = authenticatedRedirectPath;
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  };
}

export const defaultSecureAuthMiddlewareMatcher = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
