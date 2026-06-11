import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { traceAuth } from "@/modules/auth/lib/auth-trace";

const TWO_FACTOR_ALLOWED_PREFIXES = [
  "/login",
  "/api/auth",
  "/api/auth/login",
  "/_next",
  "/icon.svg",
  "/apple-icon",
  "/account-deleted",
];

const EMAIL_VERIFICATION_ALLOWED_PREFIXES = [
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
];

function isAllowedPath(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function rewritePasswordManagerFormPost(request: NextRequest) {
  if (request.method !== "POST") return null;

  const pathname = request.nextUrl.pathname;
  if (pathname === "/login") {
    traceAuth("middleware_rewrite_login_post");
    const url = request.nextUrl.clone();
    url.pathname = "/api/auth/login/start-form";
    return NextResponse.rewrite(url);
  }

  if (pathname === "/login/2fa") {
    traceAuth("middleware_rewrite_2fa_post");
    const url = request.nextUrl.clone();
    url.pathname = "/api/auth/login/verify-2fa-form";
    return NextResponse.rewrite(url);
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const rewritten = rewritePasswordManagerFormPost(request);
  if (rewritten) return rewritten;

  const pathname = request.nextUrl.pathname;
  if (
    request.method === "GET" &&
    (pathname === "/login" || pathname === "/login/2fa" || pathname === "/login/complete")
  ) {
    traceAuth("middleware_auth_page_get", {
      path: pathname,
      referer: request.headers.get("referer") ?? "",
    });
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token?.twoFactorPending && token.twoFactorVerified === false) {
    if (!isAllowedPath(pathname, TWO_FACTOR_ALLOWED_PREFIXES)) {
      traceAuth("middleware_redirect_pending_2fa", { from: pathname });
      const url = request.nextUrl.clone();
      url.pathname = "/login/2fa";
      return NextResponse.redirect(url);
    }
  }

  if (token?.emailVerificationRequired) {
    if (!isAllowedPath(pathname, EMAIL_VERIFICATION_ALLOWED_PREFIXES)) {
      traceAuth("middleware_redirect_email_verification", { from: pathname });
      const url = request.nextUrl.clone();
      url.pathname = "/check-email";
      if (typeof token.email === "string" && token.email.length > 0) {
        url.searchParams.set("email", token.email);
      }
      url.searchParams.set("required", "1");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
