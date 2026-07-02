import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTestServices } from "@/test/helpers/mock-services";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  confirmEmailVerification: vi.fn(),
  resetPassword: vi.fn(),
  validatePasswordResetToken: vi.fn(),
  changePassword: vi.fn(),
  resendVerificationByEmail: vi.fn(),
  sendVerificationEmailForUser: vi.fn(),
  getAccountAuthStatus: vi.fn(),
  requireSessionUser: vi.fn(),
  requireVerifiedMutatingAccountUser: vi.fn(),
}));

vi.mock("@/modules/auth/lib/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/modules/auth/lib/route-auth", () => ({
  requireVerifiedMutatingAccountUser: mocks.requireVerifiedMutatingAccountUser,
}));

let services: SecureAuthServices;

async function buildServices() {
  return getTestServices({}, (base) => ({
    accountAuthService: {
      ...base.accountAuthService,
      requestPasswordReset: mocks.requestPasswordReset,
      confirmEmailVerification: mocks.confirmEmailVerification,
      resetPassword: mocks.resetPassword,
      validatePasswordResetToken: mocks.validatePasswordResetToken,
      changePassword: mocks.changePassword,
      resendVerificationByEmail: mocks.resendVerificationByEmail,
      sendVerificationEmailForUser: mocks.sendVerificationEmailForUser,
      getAccountAuthStatus: mocks.getAccountAuthStatus,
    },
  }));
}

describe("account auth API routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: "550e8400-e29b-41d4-a716-446655440000" });
    mocks.requireVerifiedMutatingAccountUser.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
    services = await buildServices();
  });

  it("POST /api/auth/forgot-password rejects invalid email", async () => {
    const { forgotPasswordPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email" }),
      }),
      services
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/forgot-password returns generic message", async () => {
    mocks.requestPasswordReset.mockResolvedValue({
      message: "If an account exists for this email, we'll send password reset instructions.",
    });
    const { forgotPasswordPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
      services
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: "If an account exists for this email, we'll send password reset instructions.",
    });
  });

  it("POST /api/auth/forgot-password returns generic message on service failures", async () => {
    mocks.requestPasswordReset.mockRejectedValue(
      new Error('Failed query: select "status" from "users" where "users"."email" = $1')
    );
    const { forgotPasswordPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
      services
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: "If an account exists for this email, we'll send password reset instructions.",
    });
  });

  it("POST /api/auth/verify-email/confirm rejects invalid body", async () => {
    const { verifyEmailConfirmPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      services
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/verify-email/confirm maps validation failures", async () => {
    const { ValidationError } = await import("@/modules/account/services/account-service");
    mocks.confirmEmailVerification.mockRejectedValue(
      new ValidationError("This verification link is invalid or expired.")
    );
    const { verifyEmailConfirmPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ token: "bad" }),
      }),
      services
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/verify-email/confirm verifies token", async () => {
    mocks.confirmEmailVerification.mockResolvedValue({ verified: true, email: "user@example.com" });
    const { verifyEmailConfirmPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ token: "abc" }),
      }),
      services
    );
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/reset-password rejects password transport violations", async () => {
    const { resetPasswordPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost/api/auth/reset-password?password=secret", {
        method: "POST",
        body: JSON.stringify({
          token: "abc",
          newPassword: "long-enough-password",
        }),
      }),
      services
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/reset-password rejects invalid body", async () => {
    const { resetPasswordPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ token: "abc" }),
      }),
      services
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/reset-password resets password", async () => {
    const { resetPasswordPost: POST } = await import("@/test/helpers/handlers");

    const { ValidationError } = await import("@/modules/account/services/account-service");
    mocks.resetPassword.mockRejectedValue(new ValidationError("expired"));
    const badReset = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          token: "abc",
          newPassword: "long-enough-password",
        }),
      }),
      services
    );
    expect(badReset.status).toBe(400);

    mocks.resetPassword.mockResolvedValue({ success: true });
    const resetRes = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          token: "abc",
          newPassword: "long-enough-password",
        }),
      }),
      services
    );
    expect(resetRes.status).toBe(200);
  });

  it("POST /api/account/change-password rejects password transport violations", async () => {
    const { changePasswordPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost/api/account/change-password?password=secret", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: "old-password",
          newPassword: "long-enough-password",
        }),
      }),
      services
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/account/change-password rejects invalid body", async () => {
    const { changePasswordPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost:3001/api/account/change-password", {
        method: "POST",
        headers: { Origin: "http://localhost:3001" },
        body: JSON.stringify({ currentPassword: "x" }),
      }),
      services
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/account/change-password maps reauthentication failures", async () => {
    const { ReauthenticationRequiredError } = await import("@/modules/account/services/account-service");
    mocks.changePassword.mockRejectedValue(new ReauthenticationRequiredError("Incorrect password"));
    const { changePasswordPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: "wrong",
          newPassword: "long-enough-password",
        }),
      }),
      services
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/account/change-password updates password", async () => {
    mocks.changePassword.mockResolvedValue({ success: true });
    const { changePasswordPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: "old-password",
          newPassword: "long-enough-password",
        }),
      }),
      services
    );
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/verify-email/resend reports already verified", async () => {
    mocks.sendVerificationEmailForUser.mockResolvedValue({ alreadyVerified: true });
    const { verifyEmailResendPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(new Request("http://localhost", { method: "POST", body: "{}" }), services);
    expect((await res.json()).message).toContain("already verified");
  });

  it("POST /api/auth/verify-email/resend works for authenticated users", async () => {
    mocks.sendVerificationEmailForUser.mockResolvedValue({ alreadyVerified: false });
    const { verifyEmailResendPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(new Request("http://localhost", { method: "POST", body: "{}" }), services);
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/verify-email/resend rejects invalid email body", async () => {
    const { verifyEmailResendPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "not-email" }),
      }),
      services
    );
    expect(res.status).toBe(200);
    expect(mocks.resendVerificationByEmail).not.toHaveBeenCalled();
  });

  it("POST /api/auth/verify-email/resend works with email body", async () => {
    mocks.resendVerificationByEmail.mockResolvedValue({ message: "sent" });
    const { verifyEmailResendPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
      services
    );
    expect(res.status).toBe(200);
  });

  it("GET /api/account/auth-status surfaces not found errors", async () => {
    const { NotFoundError } = await import("@/modules/account/services/account-service");
    mocks.getAccountAuthStatus.mockRejectedValue(new NotFoundError("Account not found"));
    const { accountAuthStatusGet: GET } = await import("@/test/helpers/handlers");
    const res = await GET(services);
    expect(res.status).toBe(404);
  });

  it("GET /api/account/auth-status returns account auth status", async () => {
    mocks.getAccountAuthStatus.mockResolvedValue({
      email: "user@example.com",
      emailVerified: false,
      canChangePassword: true,
      hasPassword: true,
      authProvider: "credentials",
    });
    const { accountAuthStatusGet: GET } = await import("@/test/helpers/handlers");
    const res = await GET(services);
    expect(res.status).toBe(200);
  });
});
