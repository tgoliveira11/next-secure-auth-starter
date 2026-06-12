import type { NextAuthOptions } from "next-auth";
import { getAuthOptions } from "@/modules/auth/lib/auth-options";
import { getClientIp } from "@/lib/request-ip";
import { runWithLoginRequestContext } from "@/modules/auth/lib/login-request-context";

type NextAuthRouteHandler = (request: Request, context: unknown) => Response | Promise<Response>;
type NextAuthFactory = (options: NextAuthOptions) => NextAuthRouteHandler;

/**
 * Build NextAuth App Router handlers without importing `next-auth` at module scope.
 * Apps should pass `NextAuth` from their own dependency so Turbopack/webpack can externalize it.
 */
export function createNextAuthRouteHandlers(nextAuth: NextAuthFactory) {
  let handler: NextAuthRouteHandler | undefined;

  function getHandler() {
    handler ??= nextAuth(getAuthOptions());
    return handler;
  }

  async function wrappedHandler(request: Request, context: unknown) {
    const ip = getClientIp(request);
    return runWithLoginRequestContext(ip, () => getHandler()(request, context));
  }

  return { GET: wrappedHandler, POST: wrappedHandler };
}
