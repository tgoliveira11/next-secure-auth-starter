"use client";

export { ConfirmDialog } from "../modules/ui/primitives/confirm-dialog";
export { usePasswordManagerFormSubmit } from "../lib/forms/use-password-manager-form";
export { defaultSignOutAccount } from "../lib/sign-out-account";
export {
  signInWithPasskey,
  isPasskeyLoginSupported,
  getPasskeyLoginUnsupportedMessage,
  buildPasskeyLoginOutcomeKey,
  buildPasskeyLoginOptionsPayload,
  type PasskeyLoginOutcome,
  type SignInWithPasskeyOptions,
} from "../lib/passkey/sign-in-with-passkey.js";
