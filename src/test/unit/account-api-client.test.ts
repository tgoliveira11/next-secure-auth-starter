import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { accountAuthApi } from "@/lib/api-client/account-auth";
import { accountSessionsApi } from "@/lib/api-client/account-sessions";
import { passkeyAccountApi } from "@/lib/api-client/passkey-account";
import { passkeyLoginApi } from "@/lib/api-client/passkey-login";
import { twoFactorApi, authLoginApi } from "@/lib/api-client/two-factor";
import { accountApi } from "@/lib/api-client/account";

describe("account API clients", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const method = init?.method ?? "GET";
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;

        if (url === "/api/account/auth-status" && method === "GET") {
          return new Response(
            JSON.stringify({
              email: "user@example.com",
              authProvider: "credentials",
              hasPassword: true,
              emailVerified: true,
              canChangePassword: true,
            }),
            { status: 200 }
          );
        }

        if (url === "/api/auth/verify-email/resend" && method === "POST") {
          return new Response(JSON.stringify({ message: "Sent" }), { status: 200 });
        }

        if (url === "/api/auth/verify-email/confirm" && method === "POST") {
          return new Response(
            JSON.stringify({ verified: true, email: body?.token ? "user@example.com" : "" }),
            { status: 200 }
          );
        }

        if (url === "/api/auth/forgot-password" && method === "POST") {
          return new Response(JSON.stringify({ message: "Check email" }), { status: 200 });
        }

        if (url === "/api/auth/reset-password" && method === "POST") {
          if (body?.action === "validate") {
            return new Response(JSON.stringify({ valid: true }), { status: 200 });
          }
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (url === "/api/account/change-password" && method === "POST") {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (url === "/api/account/sessions" && method === "GET") {
          return new Response(JSON.stringify({ sessions: [] }), { status: 200 });
        }

        if (url === "/api/account/sessions/ping" && method === "POST") {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        if (url === "/api/account/sessions/revoke-current" && method === "POST") {
          return new Response(JSON.stringify({ revoked: true }), { status: 200 });
        }

        if (url.startsWith("/api/account/sessions/") && method === "DELETE") {
          return new Response(JSON.stringify({ revoked: true, signOut: false }), { status: 200 });
        }

        if (url === "/api/account/sessions/revoke-others" && method === "POST") {
          return new Response(JSON.stringify({ revokedCount: 2 }), { status: 200 });
        }

        if (url === "/api/account/sessions/revoke-all" && method === "POST") {
          return new Response(JSON.stringify({ revokedCount: 3, signOut: true }), { status: 200 });
        }

        if (url === "/api/account/passkeys" && method === "GET") {
          return new Response(JSON.stringify({ passkeys: [] }), { status: 200 });
        }

        if (url === "/api/account/passkeys/register" && method === "POST") {
          if (body?.action === "options") {
            return new Response(JSON.stringify({ challenge: "abc" }), { status: 200 });
          }
          return new Response(JSON.stringify({ verified: true, credentialId: "cred-1" }), {
            status: 200,
          });
        }

        if (url.startsWith("/api/account/passkeys/") && method === "DELETE") {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (url === "/api/auth/passkey/login/options" && method === "POST") {
          return new Response(JSON.stringify({ options: { challenge: "xyz" } }), { status: 200 });
        }

        if (url === "/api/auth/passkey/login/verify" && method === "POST") {
          return new Response(
            JSON.stringify({ loginToken: "token", userId: "user", credentialId: "cred" }),
            { status: 200 }
          );
        }

        if (url === "/api/account/2fa/status" && method === "GET") {
          return new Response(
            JSON.stringify({ enabled: false, enabledAt: null, hasPendingSetup: false }),
            { status: 200 }
          );
        }

        if (url === "/api/account/2fa/setup/start" && method === "POST") {
          return new Response(
            JSON.stringify({
              qrCodeDataUrl: "data:image/png;base64,abc",
              manualSetupKey: "SECRET",
              otpauthUrl: "otpauth://totp/test",
              issuer: "Starter",
              accountLabel: "user@example.com",
            }),
            { status: 200 }
          );
        }

        if (url === "/api/account/2fa/setup/verify" && method === "POST") {
          return new Response(JSON.stringify({ success: true, backupCodes: ["AAAA-BBBB"] }), {
            status: 200,
          });
        }

        if (url === "/api/account/2fa/disable" && method === "POST") {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (url === "/api/account/2fa/backup-codes/regenerate" && method === "POST") {
          return new Response(JSON.stringify({ backupCodes: ["CCCC-DDDD"] }), { status: 200 });
        }

        if (url === "/api/auth/login/start" && method === "POST") {
          return new Response(JSON.stringify({ requiresTwoFactor: false, loginToken: "login" }), {
            status: 200,
          });
        }

        if (url === "/api/auth/login/verify-2fa" && method === "POST") {
          return new Response(JSON.stringify({ loginToken: "login" }), { status: 200 });
        }

        if (url === "/api/auth/login/verify-2fa-oauth" && method === "POST") {
          return new Response(JSON.stringify({ upgradeToken: "upgrade" }), { status: 200 });
        }

        if (url === "/api/account" && method === "GET") {
          return new Response(
            JSON.stringify({
              requiresPassword: true,
              authProvider: "credentials",
              confirmationPhrase: "DELETE MY ACCOUNT",
            }),
            { status: 200 }
          );
        }

        if (url === "/api/account" && method === "DELETE") {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        return new Response("{}", { status: 404 });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads account auth status", async () => {
    await expect(accountAuthApi.getStatus()).resolves.toMatchObject({
      email: "user@example.com",
      canChangePassword: true,
    });
  });

  it("handles verification and password flows", async () => {
    await expect(accountAuthApi.resendVerification()).resolves.toEqual({ message: "Sent" });
    await expect(accountAuthApi.resendVerification({ email: "user@example.com" })).resolves.toEqual(
      { message: "Sent" }
    );
    await expect(accountAuthApi.confirmVerification("token")).resolves.toMatchObject({
      verified: true,
    });
    await expect(accountAuthApi.forgotPassword("user@example.com")).resolves.toEqual({
      message: "Check email",
    });
    await expect(accountAuthApi.validateResetToken("token")).resolves.toEqual({ valid: true });
    await expect(accountAuthApi.resetPassword("token", "new-password")).resolves.toEqual({
      success: true,
    });
    await expect(accountAuthApi.changePassword("old", "new")).resolves.toEqual({ success: true });
  });

  it("handles session management endpoints", async () => {
    await expect(accountSessionsApi.list()).resolves.toEqual({ sessions: [] });
    await expect(accountSessionsApi.ping()).resolves.toEqual({ ok: true });
    await expect(accountSessionsApi.revokeCurrent()).resolves.toEqual({ revoked: true });
    await expect(accountSessionsApi.revoke("session-id")).resolves.toEqual({
      revoked: true,
      signOut: false,
    });
    await expect(accountSessionsApi.revokeOthers()).resolves.toEqual({ revokedCount: 2 });
    await expect(accountSessionsApi.revokeAll()).resolves.toEqual({
      revokedCount: 3,
      signOut: true,
    });
  });

  it("handles passkey account and login clients", async () => {
    await expect(passkeyAccountApi.list()).resolves.toEqual({ passkeys: [] });
    await expect(passkeyAccountApi.registerOptions()).resolves.toMatchObject({ challenge: "abc" });
    await expect(
      passkeyAccountApi.registerVerify({ response: { id: "cred" }, friendlyName: "Laptop" })
    ).resolves.toEqual({ verified: true, credentialId: "cred-1" });
    await expect(passkeyAccountApi.remove("pk-1")).resolves.toEqual({ success: true });

    await expect(passkeyLoginApi.options()).resolves.toMatchObject({ options: { challenge: "xyz" } });
    await expect(
      passkeyLoginApi.options({ email: "user@example.com", credentialId: "cred" })
    ).resolves.toMatchObject({ options: { challenge: "xyz" } });
    await expect(passkeyLoginApi.verify({ response: { id: "cred" } })).resolves.toMatchObject({
      loginToken: "token",
    });
  });

  it("handles two-factor and auth login clients", async () => {
    await expect(twoFactorApi.status()).resolves.toMatchObject({ enabled: false });
    await expect(twoFactorApi.startSetup()).resolves.toMatchObject({ manualSetupKey: "SECRET" });
    await expect(twoFactorApi.verifySetup({ code: "123456" })).resolves.toMatchObject({
      success: true,
    });
    await expect(twoFactorApi.disable({ code: "123456" })).resolves.toEqual({ success: true });
    await expect(twoFactorApi.regenerateBackupCodes({ backupCode: "AAAA-BBBB-CCCC" })).resolves.toEqual(
      { backupCodes: ["CCCC-DDDD"] }
    );

    await expect(
      authLoginApi.start({ email: "user@example.com", password: "password123" })
    ).resolves.toMatchObject({ loginToken: "login" });
    await expect(
      authLoginApi.verifyTwoFactor({ code: "123456" })
    ).resolves.toEqual({ loginToken: "login" });
    await expect(authLoginApi.verifyOAuthTwoFactor({ code: "123456" })).resolves.toEqual({
      upgradeToken: "upgrade",
    });
  });

  it("handles account deletion client", async () => {
    await expect(accountApi.getDeletionRequirements()).resolves.toMatchObject({
      requiresPassword: true,
    });
    await expect(
      accountApi.deleteAccount({ confirmationPhrase: "DELETE MY ACCOUNT", password: "secret" })
    ).resolves.toEqual({ success: true });
  });
});
