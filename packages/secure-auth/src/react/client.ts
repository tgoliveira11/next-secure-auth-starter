"use client";

export { ConfirmDialog } from "../modules/ui/primitives/confirm-dialog";
export { usePasswordManagerFormSubmit } from "../lib/forms/use-password-manager-form";
export { defaultSignOutAccount } from "../lib/sign-out-account";
export { signOutWithRedirect } from "../lib/sign-out-with-redirect";
export {
  signInWithPasskey,
  isPasskeyLoginSupported,
  getPasskeyLoginUnsupportedMessage,
  buildPasskeyLoginOutcomeKey,
  buildPasskeyLoginOptionsPayload,
  type PasskeyLoginOutcome,
  type SignInWithPasskeyOptions,
} from "../lib/passkey/sign-in-with-passkey.js";
export { TurnstileCaptcha, type TurnstileCaptchaProps } from "../modules/ui/features/auth/turnstile-captcha";
export {
  mergeGuestPreferences,
  buildPreferencesMergeStorageKey,
  type MergeGuestPreferencesOptions,
  type MergeGuestPreferencesResult,
  type MergeGuestPreferencesStrategy,
} from "../modules/preferences/react/merge-guest-preferences.js";
export {
  useUserPreferences,
  useUserPreference,
  usePreferencesEnabled,
} from "../modules/preferences/react/use-user-preferences.js";
export {
  useMergeGuestPreferences,
  type UseMergeGuestPreferencesOptions,
} from "../modules/preferences/react/use-merge-guest-preferences.js";
export {
  PasswordStrengthField,
  type PasswordStrengthFieldProps,
} from "../modules/ui/features/password/password-strength-field";
export {
  PasswordSetupFields,
  type PasswordSetupFieldsProps,
} from "../modules/ui/features/password/password-setup-fields";
