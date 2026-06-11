import { describe, it, expect, vi } from "vitest";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { UnauthorizedError } from "@/lib/auth/session";
import { NotFoundError } from "@/server/services/account-service";
import { RateLimitError } from "@/server/policies/rate-limit";
import { TwoFactorEncryptionKeyError } from "@/server/policies/two-factor-secret-crypto";
import { ValidationError, ConflictError } from "@/server/services/two-factor-service";
import { ChallengeError } from "@/server/services/passkey-service";
import { EmailVerificationRequiredError } from "@/lib/account-policy-config";

describe("api helpers", () => {
  it("parseJsonBody returns parsed JSON", async () => {
    const body = await parseJsonBody(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ ok: true }),
      })
    );
    expect(body).toEqual({ ok: true });
  });

  it("parseJsonBody returns empty object on invalid JSON", async () => {
    const body = await parseJsonBody(
      new Request("http://localhost", { method: "POST", body: "not-json" })
    );
    expect(body).toEqual({});
  });

  it("apiError maps unauthorized to 401", async () => {
    const res = apiError(new UnauthorizedError("Authentication required"), "GET /test");
    expect(res.status).toBe(401);
  });

  it("apiError maps NotFoundError to 404", async () => {
    const res = apiError(new NotFoundError("missing"), "GET /test");
    expect(res.status).toBe(404);
  });

  it("apiError maps RateLimitError to 429", async () => {
    const res = apiError(new RateLimitError("slow down"), "POST /test");
    expect(res.status).toBe(429);
  });

  it("apiError maps ValidationError to 400", async () => {
    const res = apiError(new ValidationError("invalid code"), "POST /test");
    expect(res.status).toBe(400);
  });

  it("apiError maps ConflictError to 409", async () => {
    const res = apiError(new ConflictError("already enabled"), "POST /test");
    expect(res.status).toBe(409);
  });

  it("apiError maps ChallengeError to 400", async () => {
    const res = apiError(new ChallengeError("challenge expired"), "POST /test");
    expect(res.status).toBe(400);
  });

  it("apiError maps ReauthenticationRequiredError to 401", async () => {
    const err = new Error("reauth required");
    err.name = "ReauthenticationRequiredError";
    const res = apiError(err, "POST /test");
    expect(res.status).toBe(401);
  });

  it("apiError maps EmailVerificationRequiredError to 403", async () => {
    const res = apiError(new EmailVerificationRequiredError(), "POST /test");
    expect(res.status).toBe(403);
  });

  it("apiError maps TwoFactorEncryptionKeyError to 503", async () => {
    const res = apiError(new TwoFactorEncryptionKeyError(), "POST /api/account/2fa/setup/start");
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("TWO_FACTOR_SECRET_ENCRYPTION_KEY"),
    });
  });

  it("apiError maps unknown errors to 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = apiError(new Error("boom"), "POST /test");
    expect(res.status).toBe(500);
    spy.mockRestore();
  });

  it("apiError maps non-Error unknown values to 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = apiError("unexpected", "POST /test");
    expect(res.status).toBe(500);
    spy.mockRestore();
  });
});
