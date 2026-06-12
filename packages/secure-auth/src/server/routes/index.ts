import type { SecureAuthServices } from "../../core/types.js";
import { createLoginStartPostHandler } from "./handlers/login-start.js";

/**
 * Route handler registry. Handlers migrate from apps/starter incrementally.
 * Each export is a Next.js App Router compatible { GET | POST | DELETE } handler.
 */
export function createRouteHandlers(getServices: () => SecureAuthServices) {
  return {
    health: {
      GET: async () =>
        new Response(JSON.stringify({ ok: true, package: "@tgoliveira/secure-auth", version: "0.1.0" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    },
    loginStart: {
      POST: (request: Request) => createLoginStartPostHandler(getServices())(request),
    },
    loginComplete: { POST: notImplemented("loginComplete.POST") },
    register: { POST: notImplemented("register.POST") },
    verifyEmail: { POST: notImplemented("verifyEmail.POST") },
    passwordResetStart: { POST: notImplemented("passwordResetStart.POST") },
    passwordResetComplete: { POST: notImplemented("passwordResetComplete.POST") },
    twoFactorSetup: { POST: notImplemented("twoFactorSetup.POST") },
    twoFactorVerify: { POST: notImplemented("twoFactorVerify.POST") },
    passkeyRegister: { POST: notImplemented("passkeyRegister.POST") },
    passkeyAuthenticate: { POST: notImplemented("passkeyAuthenticate.POST") },
    sessions: {
      GET: notImplemented("sessions.GET"),
      DELETE: notImplemented("sessions.DELETE"),
    },
  };
}

function notImplemented(name: string) {
  return async () =>
    new Response(JSON.stringify({ error: `${name} not yet migrated to package` }), {
      status: 501,
      headers: { "content-type": "application/json" },
    });
}
