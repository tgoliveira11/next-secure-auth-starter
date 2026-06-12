import type { NextAuthOptions } from "next-auth";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { runWithLoginRequestContext } from "@/modules/auth/lib/login-request-context";
import type { SecureAuthServices } from "@/core/types";

type NextAuthRouteHandler = (request: Request, context: unknown) => Response | Promise<Response>;
type NextAuthFactory = (options: NextAuthOptions) => NextAuthRouteHandler;

/**
 * Build NextAuth App Router handlers without importing `next-auth` at module scope.
 * Apps should pass `NextAuth` from their own dependency so Turbopack/webpack can externalize it.
 */
export function createNextAuthRouteHandlers(
  nextAuth: NextAuthFactory,
  getServices: () => Promise<SecureAuthServices>
) {
  let handler: NextAuthRouteHandler | undefined;

  async function getHandler() {
    if (!handler) {
      const { default: NextAuth } = await import("next-auth");
      const services = await getServices();
      handler = nextAuth(services.getAuthOptions());
    }
    return handler;
  }

  async function wrappedHandler(request: Request, context: unknown) {
    const ip = getClientIp(request);
    return runWithLoginRequestContext(ip, () => getHandler().then((h) => h(request, context)));
  }

  return { GET: wrappedHandler, POST: wrappedHandler };
}
