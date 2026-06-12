/**
 * Direct handler exports for package route tests.
 * Prefer importing handlers here so mocks target the same `@/` module graph.
 */

export { POST as registerPost } from "../../server/routes/handlers/auth/register.js";
export { POST as forgotPasswordPost } from "../../server/routes/handlers/auth/forgot-password.js";
export { POST as resetPasswordPost } from "../../server/routes/handlers/auth/reset-password.js";
export { POST as verifyEmailConfirmPost } from "../../server/routes/handlers/auth/verify-email-confirm.js";
export { POST as verifyEmailResendPost } from "../../server/routes/handlers/auth/verify-email-resend.js";
export { POST as loginStartPost } from "../../server/routes/handlers/login-start.js";
export { POST as loginVerify2faPost } from "../../server/routes/handlers/auth/login-verify-2fa.js";
export { POST as loginVerify2faOauthPost } from "../../server/routes/handlers/auth/login-verify-2fa-oauth.js";
export { POST as loginStartFormPost } from "../../server/routes/handlers/auth/login-start-form.js";
export { POST as loginVerify2faFormPost } from "../../server/routes/handlers/auth/login-verify-2fa-form.js";
export { POST as passkeyLoginOptionsPost } from "../../server/routes/handlers/auth/passkey-login-options.js";
export { POST as passkeyLoginVerifyPost } from "../../server/routes/handlers/auth/passkey-login-verify.js";
export {
  GET as accountGet,
  DELETE as accountDelete,
} from "../../server/routes/handlers/account/account.js";
export { GET as accountAuthStatusGet } from "../../server/routes/handlers/account/auth-status.js";
export { POST as changePasswordPost } from "../../server/routes/handlers/account/change-password.js";
export { GET as passkeysListGet } from "../../server/routes/handlers/account/passkeys-list.js";
export { POST as passkeyRegisterPost } from "../../server/routes/handlers/account/passkeys-register.js";
export { DELETE as passkeyDelete } from "../../server/routes/handlers/account/passkeys-delete.js";
export { GET as sessionsListGet } from "../../server/routes/handlers/account/sessions-list.js";
export { DELETE as sessionDelete } from "../../server/routes/handlers/account/sessions-delete.js";
export { POST as sessionsPingPost } from "../../server/routes/handlers/account/sessions-ping.js";
export { POST as sessionsRevokeCurrentPost } from "../../server/routes/handlers/account/sessions-revoke-current.js";
export { POST as sessionsRevokeOthersPost } from "../../server/routes/handlers/account/sessions-revoke-others.js";
export { POST as sessionsRevokeAllPost } from "../../server/routes/handlers/account/sessions-revoke-all.js";
export { GET as twoFactorStatusGet } from "../../server/routes/handlers/account/two-factor-status.js";
export { POST as twoFactorSetupStartPost } from "../../server/routes/handlers/account/two-factor-setup-start.js";
export { POST as twoFactorSetupVerifyPost } from "../../server/routes/handlers/account/two-factor-setup-verify.js";
export { POST as twoFactorDisablePost } from "../../server/routes/handlers/account/two-factor-disable.js";
export { POST as twoFactorBackupCodesPost } from "../../server/routes/handlers/account/two-factor-backup-codes.js";
export { GET as loginChallengeStatusGet } from "../../server/routes/handlers/auth/login-challenge-status.js";
export { GET as passwordPolicyGet } from "../../server/routes/handlers/auth/password-policy.js";
export { POST as loginCompletePost } from "../../server/routes/handlers/auth/login-complete.js";
