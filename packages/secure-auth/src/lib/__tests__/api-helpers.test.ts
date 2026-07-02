import { describe, it, expect, vi } from "vitest";
import { apiError, parseJsonBody } from "../api-helpers";
import { UnauthorizedError } from "@/modules/auth/lib/session";
import { TwoFactorEncryptionKeyError } from "@/modules/two-factor/policies/two-factor-secret-crypto";
import { SameOriginError } from "@/modules/security/policies/same-origin";
import { EmailVerificationRequiredError } from "@/modules/account/lib/account-policy-config";
import { NotFoundError, ValidationError, ReauthenticationRequiredError } from "@/modules/account/lib/account-errors";
import { ConflictError } from "@/modules/two-factor/services/two-factor-service";
import { RateLimitError } from "@/modules/rate-limit";
import { DatabaseSchemaError } from "@/modules/database/lib/database-errors";
import { ChallengeError } from "@/modules/passkeys/services/passkey-service";

describe("apiError", () => {
  it("maps known error classes to status codes", async () => {
    const cases: Array<{ error: Error; status: number }> = [
      { error: new UnauthorizedError("auth"), status: 401 },
      { error: new TwoFactorEncryptionKeyError(), status: 503 },
      { error: new DatabaseSchemaError("schema out of date"), status: 503 },
      { error: new SameOriginError(), status: 403 },
      { error: new EmailVerificationRequiredError(), status: 403 },
      { error: new NotFoundError("missing"), status: 404 },
      { error: new ConflictError("conflict"), status: 409 },
      { error: new RateLimitError("slow"), status: 429 },
      { error: new ChallengeError("challenge"), status: 400 },
      { error: new ValidationError("invalid"), status: 400 },
      { error: new ReauthenticationRequiredError("reauth"), status: 401 },
    ];

    for (const { error, status } of cases) {
      const response = apiError(error, "/test");
      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toEqual({ error: error.message });
    }
  });

  it("returns 500 for unknown errors", async () => {
    const response = apiError(new Error("boom"), "/test");
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal server error" });
  });
});

describe("parseJsonBody", () => {
  it("parses valid JSON bodies", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com" }),
    });

    await expect(parseJsonBody(request)).resolves.toEqual({ email: "user@example.com" });
  });

  it("returns empty object for invalid JSON", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: "not-json",
    });

    await expect(parseJsonBody(request)).resolves.toEqual({});
  });
});
