import { describe, it, expect } from "vitest";
import {
  passwordResetEmailContent,
  verificationEmailContent,
} from "@/modules/email/templates/account-email-templates";

const SENTINEL = "SENTINEL-DO-NOT-STORE-PLAINTEXT-12345";

describe("account email templates", () => {
  it("never includes sensitive payload content", () => {
    const verification = verificationEmailContent("opaque-token");
    const reset = passwordResetEmailContent("opaque-token");
    for (const content of [verification.text, verification.html, reset.text, reset.html]) {
      expect(content).not.toContain(SENTINEL);
      expect(content).not.toMatch(/encryptedTitle|encryptedBody|vaultKey/i);
    }
  });

  it("includes app branding in verification subject", () => {
    const { subject } = verificationEmailContent("opaque-token");
    expect(subject).toMatch(/Verify your email/);
  });
});
