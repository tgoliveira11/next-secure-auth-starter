import { describe, it, expect } from "vitest";
import {
  getPasskeyRegistrationErrorMessage,
  isDuplicateAuthenticatorRegistrationError,
  PASSKEY_DUPLICATE_AUTHENTICATOR_MESSAGE,
} from "../passkey-registration-errors";

describe("passkey registration errors", () => {
  it("detects InvalidStateError as duplicate authenticator", () => {
    const error = new Error("The authenticator was previously registered");
    error.name = "InvalidStateError";
    expect(isDuplicateAuthenticatorRegistrationError(error)).toBe(true);
  });

  it("detects previously registered message", () => {
    expect(
      isDuplicateAuthenticatorRegistrationError(
        new Error("The authenticator was previously registered")
      )
    ).toBe(true);
  });

  it("maps duplicate authenticator to user-friendly message", () => {
    const error = new Error("The authenticator was previously registered");
    error.name = "InvalidStateError";
    expect(getPasskeyRegistrationErrorMessage(error)).toBe(
      PASSKEY_DUPLICATE_AUTHENTICATOR_MESSAGE
    );
  });

  it("maps NotAllowedError to cancellation message", () => {
    const error = new Error("User cancelled");
    error.name = "NotAllowedError";
    expect(getPasskeyRegistrationErrorMessage(error)).toBe("Passkey registration was cancelled.");
  });

  it("falls back to error message for other errors", () => {
    expect(getPasskeyRegistrationErrorMessage(new Error("Server unavailable"))).toBe(
      "Server unavailable"
    );
  });
});
