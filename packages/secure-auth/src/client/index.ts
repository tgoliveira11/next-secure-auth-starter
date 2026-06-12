/**
 * Browser-safe client utilities for consuming applications.
 * Server-only modules are exported from `@tgoliveira/secure-auth/next` instead.
 */

export * from "../lib/api-client/account.js";
export * from "../lib/api-client/account-auth.js";
export * from "../lib/api-client/account-sessions.js";
export * from "../lib/api-client/api-error.js";
export * from "../lib/api-client/client.js";
export * from "../lib/api-client/parse-response.js";
export * from "../lib/api-client/passkey-account.js";
export * from "../lib/api-client/passkey-login.js";
export * from "../lib/api-client/two-factor.js";

export * from "../modules/account/lib/account-auth-messages.js";
export * from "../modules/account/lib/account-deletion.js";
export * from "../modules/sessions/lib/account-session-types.js";

export * from "../modules/passkeys/lib/credential-label.js";
export * from "../modules/passkeys/lib/login-hint.js";
export * from "../modules/passkeys/lib/messages.js";
export * from "../modules/passkeys/lib/prepare-webauthn-options.js";

export * from "../lib/forms/read-named-form-field.js";

export * from "../lib/validation/two-factor.js";

export * from "../modules/sessions/lib/format-auth-method.js";
export * from "../modules/sessions/lib/format-auth-provider.js";
export * from "../modules/sessions/lib/format-session-datetime.js";

export { cn } from "../modules/ui/lib/cn.js";
export { buildBrandMarkSvg, buildBrandMarkDataUrl } from "../modules/ui/lib/brand-mark.js";
export { MAIN_CONTENT_ID } from "../modules/ui/lib/main-content.js";

export {
  MICROSOFT_OAUTH_PROVIDER_ID,
  MICROSOFT_OAUTH_SCOPES,
} from "../modules/auth/lib/microsoft-provider-config.js";

export {
  getOAuthSignInErrorMessage,
  OAUTH_SIGN_IN_ERROR_CODES,
} from "../modules/auth/lib/oauth-sign-in-policy.js";

export {
  buildLoginPendingTokenCookieName,
  buildTwoFactorLoginChallengeCookieName,
  buildPasskeyLoginUserIdKey,
  buildPasskeyLoginCredentialIdKey,
  buildPasskeyLoginUserIdCookie,
  buildPasskeyLoginCredentialIdCookie,
} from "../modules/auth/lib/auth-cookie-names.js";