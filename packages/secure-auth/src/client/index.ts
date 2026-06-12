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

export * from "../lib/account-auth-messages.js";
export * from "../lib/account-deletion.js";
export * from "../lib/account-session-types.js";

export * from "../lib/passkey/credential-label.js";
export * from "../lib/passkey/login-hint.js";
export * from "../lib/passkey/messages.js";
export * from "../lib/passkey/prepare-webauthn-options.js";

export * from "../lib/forms/read-named-form-field.js";

export * from "../lib/validation/two-factor.js";

export * from "../lib/ui/format-auth-method.js";
export * from "../lib/ui/format-auth-provider.js";
export * from "../lib/ui/format-session-datetime.js";

export { cn } from "../modules/ui/lib/cn.js";
export { BRAND_MARK_SVG, brandMarkDataUrl } from "../modules/ui/lib/brand-mark.js";
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
  TWO_FACTOR_LOGIN_CHALLENGE_COOKIE,
} from "../modules/two-factor/lib/login-challenge-cookie.js";

export {
  LOGIN_PENDING_TOKEN_COOKIE,
  clearLoginPendingTokenCookie,
  getLoginPendingTokenCookieOptions,
} from "../modules/auth/lib/login-pending-cookie.js";
