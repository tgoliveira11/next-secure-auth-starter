import NextAuth from "next-auth";
import { getAuthOptions } from "@/modules/auth/lib/auth-options";
import { getClientIp } from "@/lib/request-ip";
import { runWithLoginRequestContext } from "@/modules/auth/lib/login-request-context";

let handler: ReturnType<typeof NextAuth> | undefined;

function getHandler() {
  if (!handler) {
    handler = NextAuth(getAuthOptions());
  }
  return handler;
}

async function wrappedHandler(request: Request, context: unknown) {
  const ip = getClientIp(request);
  return runWithLoginRequestContext(ip, () => getHandler()(request, context));
}

export { wrappedHandler as GET, wrappedHandler as POST };
