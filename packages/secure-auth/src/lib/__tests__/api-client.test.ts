import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "../api-client/api-error";
import { apiClient } from "../api-client/client";
import { getErrorMessage, parseJsonResponse } from "../api-client/parse-response";
import { accountApi } from "../api-client/account";
import { accountAuthApi } from "../api-client/account-auth";
import { accountSessionsApi } from "../api-client/account-sessions";
import { passkeyLoginApi } from "../api-client/passkey-login";
import { passkeyAccountApi } from "../api-client/passkey-account";
import { authLoginApi, twoFactorApi } from "../api-client/two-factor";

function mockFetch(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
  );
}

describe("parseJsonResponse", () => {
  it("returns parsed JSON for valid bodies", async () => {
    const res = new Response(JSON.stringify({ ok: true }), { status: 200 });
    await expect(parseJsonResponse(res)).resolves.toEqual({ ok: true });
  });

  it("returns null for empty bodies", async () => {
    const res = new Response("", { status: 200 });
    await expect(parseJsonResponse(res)).resolves.toBeNull();
  });

  it("returns null for invalid JSON", async () => {
    const res = new Response("not-json", { status: 200 });
    await expect(parseJsonResponse(res)).resolves.toBeNull();
  });
});

describe("getErrorMessage", () => {
  it("returns error field from JSON body", async () => {
    const res = new Response(JSON.stringify({ error: "Invalid token" }), { status: 400 });
    await expect(getErrorMessage(res)).resolves.toBe("Invalid token");
  });

  it("returns server error hint for 5xx responses", async () => {
    const res = new Response("", { status: 500 });
    await expect(getErrorMessage(res)).resolves.toContain("database");
  });

  it("falls back to default message with status code", async () => {
    const res = new Response("", { status: 404, statusText: "Not Found" });
    await expect(getErrorMessage(res)).resolves.toBe("Request failed (404)");
  });

  it("uses custom fallback when provided", async () => {
    const res = new Response("", { status: 404, statusText: "Not Found" });
    await expect(getErrorMessage(res, "Not Found")).resolves.toBe("Not Found (404)");
  });
});

describe("apiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("GET returns parsed JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "1" }), { status: 200 }))
    );
    await expect(apiClient.get<{ id: string }>("/api/test")).resolves.toEqual({ id: "1" });
  });

  it("throws ApiError on non-ok responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, statusText: "Unauthorized" })
      )
    );
    await expect(apiClient.get("/api/test")).rejects.toBeInstanceOf(ApiError);
  });

  it("returns undefined for 204 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiClient.delete("/api/test")).resolves.toBeUndefined();
  });

  it("POST sends JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await apiClient.post("/api/test", { email: "user@example.com" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );
  });

  it("PATCH and PUT send JSON bodies", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await apiClient.patch("/api/test", { a: 1 });
    await apiClient.put("/api/test", { b: 2 });
    expect(fetchMock).toHaveBeenCalledWith("/api/test", expect.objectContaining({ method: "PATCH" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/test", expect.objectContaining({ method: "PUT" }));
  });

  it("throws on empty JSON success body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 200 })));
    await expect(apiClient.get("/api/test")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("api client wrappers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("accountApi calls expected endpoints", async () => {
    mockFetch({ requiresPassword: true });
    await expect(accountApi.getDeletionRequirements()).resolves.toEqual({ requiresPassword: true });
    mockFetch({ success: true });
    await expect(accountApi.deleteAccount({ confirmationPhrase: "DELETE" })).resolves.toEqual({
      success: true,
    });
  });

  it("accountAuthApi calls expected endpoints", async () => {
    mockFetch({ email: "user@example.com" });
    await expect(accountAuthApi.getStatus()).resolves.toEqual({ email: "user@example.com" });
    mockFetch({ message: "sent" });
    await expect(accountAuthApi.forgotPassword("user@example.com")).resolves.toEqual({ message: "sent" });
    mockFetch({ message: "sent" });
    await expect(accountAuthApi.resendVerification()).resolves.toEqual({ message: "sent" });
    mockFetch({ verified: true, email: "user@example.com" });
    await expect(accountAuthApi.confirmVerification("token")).resolves.toEqual({
      verified: true,
      email: "user@example.com",
    });
    mockFetch({ success: true });
    await expect(accountAuthApi.resetPassword("token", "new-password")).resolves.toEqual({
      success: true,
    });
    mockFetch({ success: true });
    await expect(accountAuthApi.changePassword("old", "new")).resolves.toEqual({ success: true });
    mockFetch({ message: "sent" });
    await expect(accountAuthApi.requestMagicLink("user@example.com")).resolves.toEqual({ message: "sent" });
  });

  it("accountSessionsApi calls expected endpoints", async () => {
    mockFetch({ sessions: [] });
    await expect(accountSessionsApi.list()).resolves.toEqual({ sessions: [] });
    mockFetch({ ok: true });
    await expect(accountSessionsApi.ping()).resolves.toEqual({ ok: true });
  });

  it("passkeyLoginApi calls expected endpoints", async () => {
    mockFetch({ options: {} });
    await expect(passkeyLoginApi.options({ email: "user@example.com" })).resolves.toEqual({ options: {} });
    mockFetch({ requiresTwoFactor: false, loginToken: "t", userId: "u", credentialId: "c" });
    await expect(passkeyLoginApi.verify({ response: {} })).resolves.toMatchObject({ loginToken: "t" });
  });

  it("passkeyAccountApi calls expected endpoints", async () => {
    mockFetch({ passkeys: [] });
    await expect(passkeyAccountApi.list()).resolves.toEqual({ passkeys: [] });
    mockFetch({ challenge: "abc" });
    await expect(passkeyAccountApi.registerOptions()).resolves.toEqual({ challenge: "abc" });
    mockFetch({ verified: true, credentialId: "c" });
    await expect(passkeyAccountApi.registerVerify({ response: {} })).resolves.toEqual({
      verified: true,
      credentialId: "c",
    });
    mockFetch({ success: true });
    await expect(passkeyAccountApi.remove("cred-1")).resolves.toEqual({ success: true });
  });

  it("twoFactorApi and authLoginApi call expected endpoints", async () => {
    mockFetch({ enabled: false });
    await expect(twoFactorApi.status()).resolves.toEqual({ enabled: false });
    mockFetch({ qrCodeDataUrl: "data:" });
    await expect(twoFactorApi.startSetup()).resolves.toMatchObject({ qrCodeDataUrl: "data:" });
    mockFetch({ success: true, backupCodes: [] });
    await expect(twoFactorApi.verifySetup({ code: "123456" })).resolves.toMatchObject({ success: true });
    mockFetch({ success: true });
    await expect(twoFactorApi.disable({ code: "123456" })).resolves.toEqual({ success: true });
    mockFetch({ backupCodes: ["abc"] });
    await expect(twoFactorApi.regenerateBackupCodes({ code: "123456" })).resolves.toEqual({
      backupCodes: ["abc"],
    });
    mockFetch({ requiresTwoFactor: false, loginToken: "token" });
    await expect(authLoginApi.start({ email: "a", password: "b" })).resolves.toMatchObject({
      loginToken: "token",
    });
    mockFetch({ pending: false });
    await expect(authLoginApi.challengeStatus()).resolves.toEqual({ pending: false });
    mockFetch({ loginToken: "token" });
    await expect(authLoginApi.verifyTwoFactor({ code: "123456" })).resolves.toEqual({
      loginToken: "token",
    });
    mockFetch({ upgradeToken: "upgrade" });
    await expect(authLoginApi.verifyOAuthTwoFactor({ code: "123456" })).resolves.toEqual({
      upgradeToken: "upgrade",
    });
  });

  it("accountSessionsApi covers all session endpoints", async () => {
    mockFetch({ revoked: true });
    await expect(accountSessionsApi.revokeCurrent()).resolves.toEqual({ revoked: true });
    mockFetch({ revoked: true, signOut: false });
    await expect(accountSessionsApi.revoke("session-1")).resolves.toEqual({
      revoked: true,
      signOut: false,
    });
    mockFetch({ revokedCount: 2 });
    await expect(accountSessionsApi.revokeOthers()).resolves.toEqual({ revokedCount: 2 });
    mockFetch({ revokedCount: 3, signOut: true });
    await expect(accountSessionsApi.revokeAll()).resolves.toEqual({ revokedCount: 3, signOut: true });
  });
});
