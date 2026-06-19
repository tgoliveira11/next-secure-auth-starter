export const PASSKEY_DUPLICATE_AUTHENTICATOR_MESSAGE =
  "This authenticator already has a passkey for this site. Try another authenticator or manage the existing credential from the appropriate settings page.";

export function isDuplicateAuthenticatorRegistrationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "InvalidStateError") return true;
  return /previously registered|already (been )?registered|authenticator.*registered/i.test(
    error.message
  );
}

export function getPasskeyRegistrationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "NotAllowedError") {
    return "Passkey registration was cancelled.";
  }
  if (isDuplicateAuthenticatorRegistrationError(error)) {
    return PASSKEY_DUPLICATE_AUTHENTICATOR_MESSAGE;
  }
  return error instanceof Error ? error.message : "Passkey registration failed";
}
