import { describe, it, expect } from "vitest";
import {
  ACCOUNT_PASSWORD_RESET_NOTE,
  CHECK_EMAIL_MESSAGE,
  CHECK_EMAIL_REQUIRED_MESSAGE,
  getCheckEmailMessage,
} from "@tgoliveira/secure-auth/client";

describe("account auth messages", () => {
  it("includes account password reset note", () => {
    expect(ACCOUNT_PASSWORD_RESET_NOTE).toContain("account password only");
    expect(ACCOUNT_PASSWORD_RESET_NOTE).toContain("passkeys or OAuth remain available");
    expect(CHECK_EMAIL_MESSAGE).toContain("verification link");
    expect(getCheckEmailMessage(false)).toBe(CHECK_EMAIL_MESSAGE);
    expect(getCheckEmailMessage(true)).toBe(CHECK_EMAIL_REQUIRED_MESSAGE);
  });
});
