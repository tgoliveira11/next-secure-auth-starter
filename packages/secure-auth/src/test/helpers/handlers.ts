/**
 * Direct handler exports for package route tests.
 * Prefer importing handlers here so mocks target the same `@/` module graph.
 */

import { createTestSecureAuth } from "./create-test-secure-auth.js";
import type { SecureAuthServices } from "../../core/types.js";
import type { RouteContext } from "../../server/routes/create-routes.js";

async function resolveServices(services?: SecureAuthServices) {
  return services ?? (await createTestSecureAuth().getServices());
}

async function invokePost(
  modulePath: string,
  request: Request,
  context?: RouteContext,
  services?: SecureAuthServices
) {
  const s = await resolveServices(services);
  const { createPostHandler } = await import(modulePath);
  return createPostHandler(s)(request, context);
}

async function invokeGet(
  modulePath: string,
  request?: Request,
  context?: RouteContext,
  services?: SecureAuthServices
) {
  const s = await resolveServices(services);
  const { createGetHandler } = await import(modulePath);
  return createGetHandler(s)(request ?? new Request("http://localhost"), context);
}

async function invokeDelete(
  modulePath: string,
  request: Request,
  context?: RouteContext,
  services?: SecureAuthServices
) {
  const s = await resolveServices(services);
  const { createDeleteHandler } = await import(modulePath);
  return createDeleteHandler(s)(request, context);
}

async function invokeLoginStartPost(request: Request, services?: SecureAuthServices) {
  const s = await resolveServices(services);
  const { createLoginStartPostHandler } = await import("../../server/routes/handlers/login-start.js");
  return createLoginStartPostHandler(s)(request);
}

export async function registerPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/auth/register.js", request, undefined, services);
}

export async function forgotPasswordPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/auth/forgot-password.js", request, undefined, services);
}

export async function resetPasswordPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/auth/reset-password.js", request, undefined, services);
}

export async function verifyEmailConfirmPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/auth/verify-email-confirm.js", request, undefined, services);
}

export async function verifyEmailResendPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/auth/verify-email-resend.js", request, undefined, services);
}

export async function loginStartPost(request: Request, services?: SecureAuthServices) {
  return invokeLoginStartPost(request, services);
}

export async function loginVerify2faPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/auth/login-verify-2fa.js", request, undefined, services);
}

export async function loginVerify2faOauthPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/auth/login-verify-2fa-oauth.js", request, undefined, services);
}

export async function loginStartFormPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/auth/login-start-form.js", request, undefined, services);
}

export async function loginVerify2faFormPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/auth/login-verify-2fa-form.js", request, undefined, services);
}

export async function passkeyLoginOptionsPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/auth/passkey-login-options.js", request, undefined, services);
}

export async function passkeyLoginVerifyPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/auth/passkey-login-verify.js", request, undefined, services);
}

export async function accountGet(services?: SecureAuthServices) {
  return invokeGet("../../server/routes/handlers/account/account.js", undefined, undefined, services);
}

export async function accountDelete(request: Request, services?: SecureAuthServices) {
  return invokeDelete("../../server/routes/handlers/account/account.js", request, undefined, services);
}

export async function accountAuthStatusGet(services?: SecureAuthServices) {
  return invokeGet("../../server/routes/handlers/account/auth-status.js", undefined, undefined, services);
}

export async function changePasswordPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/account/change-password.js", request, undefined, services);
}

export async function passkeysListGet(services?: SecureAuthServices) {
  return invokeGet("../../server/routes/handlers/account/passkeys-list.js", undefined, undefined, services);
}

export async function passkeyRegisterPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/account/passkeys-register.js", request, undefined, services);
}

export async function passkeyDelete(
  request: Request,
  context?: RouteContext,
  services?: SecureAuthServices
) {
  return invokeDelete("../../server/routes/handlers/account/passkeys-delete.js", request, context, services);
}

export async function sessionsListGet(services?: SecureAuthServices) {
  return invokeGet("../../server/routes/handlers/account/sessions-list.js", undefined, undefined, services);
}

export async function sessionDelete(
  request: Request,
  context?: RouteContext,
  services?: SecureAuthServices
) {
  return invokeDelete("../../server/routes/handlers/account/sessions-delete.js", request, context, services);
}

export async function sessionsPingPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/account/sessions-ping.js", request, undefined, services);
}

export async function sessionsRevokeCurrentPost(services?: SecureAuthServices) {
  return invokePost(
    "../../server/routes/handlers/account/sessions-revoke-current.js",
    new Request("http://localhost:3001/api/account/sessions/revoke-current", {
      method: "POST",
      headers: { Origin: "http://localhost:3001" },
    }),
    undefined,
    services
  );
}

export async function sessionsRevokeOthersPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/account/sessions-revoke-others.js", request, undefined, services);
}

export async function sessionsRevokeAllPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/account/sessions-revoke-all.js", request, undefined, services);
}

export async function twoFactorStatusGet(services?: SecureAuthServices) {
  return invokeGet("../../server/routes/handlers/account/two-factor-status.js", undefined, undefined, services);
}

export async function twoFactorSetupStartPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/account/two-factor-setup-start.js", request, undefined, services);
}

export async function twoFactorSetupVerifyPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/account/two-factor-setup-verify.js", request, undefined, services);
}

export async function twoFactorDisablePost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/account/two-factor-disable.js", request, undefined, services);
}

export async function twoFactorBackupCodesPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/account/two-factor-backup-codes.js", request, undefined, services);
}

export async function loginChallengeStatusGet(services?: SecureAuthServices) {
  return invokeGet("../../server/routes/handlers/auth/login-challenge-status.js", undefined, undefined, services);
}

export async function passwordPolicyGet(services?: SecureAuthServices) {
  return invokeGet("../../server/routes/handlers/auth/password-policy.js", undefined, undefined, services);
}

export async function magicLinkRequestPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/auth/magic-link-request.js", request, undefined, services);
}

export async function magicLinkVerifyPost(request: Request, services?: SecureAuthServices) {
  return invokePost("../../server/routes/handlers/auth/magic-link-verify.js", request, undefined, services);
}

export async function loginCompletePost(services?: SecureAuthServices) {
  return invokePost(
    "../../server/routes/handlers/auth/login-complete.js",
    new Request("http://localhost"),
    undefined,
    services
  );
}

export type { SecureAuthServices };
