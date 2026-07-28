import { afterEach, describe, expect, it, vi } from "vitest";
import { passkeyAccountApi } from "../../../../lib/api-client/passkey-account";
import { passkeyLoginApi } from "../../../../lib/api-client/passkey-login";

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("passkey API client privacy boundary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("removes PRF results before registration verification is serialized", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ verified: true, credentialId: "cred" }));
    vi.stubGlobal("fetch", fetchMock);

    await passkeyAccountApi.registerVerify({
      response: {
        id: "cred",
        clientExtensionResults: {
          credProps: { rk: true },
          prf: { enabled: true, results: { first: "PRF-SECRET-SENTINEL" } },
        },
      },
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.body).toBe(
      JSON.stringify({
        action: "verify",
        response: { id: "cred", clientExtensionResults: { credProps: { rk: true } } },
      })
    );
    expect(String(request.body)).not.toContain("PRF-SECRET-SENTINEL");
  });

  it("removes PRF results before login verification is serialized", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        requiresTwoFactor: false,
        loginToken: "token",
        userId: "user-id",
        credentialId: "cred",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await passkeyLoginApi.verify({
      response: {
        id: "cred",
        clientExtensionResults: {
          prf: { results: { first: "PRF-SECRET-SENTINEL" } },
        },
      },
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.body).toBe(
      JSON.stringify({ response: { id: "cred", clientExtensionResults: {} } })
    );
    expect(String(request.body)).not.toContain("PRF-SECRET-SENTINEL");
  });

  it("removes PRF results before sign-in capability verification is serialized", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({ verified: true, credentialId: "cred", signInEnabled: true })
    );
    vi.stubGlobal("fetch", fetchMock);

    await passkeyAccountApi.enableSignInVerify("credential-db-id", {
      response: {
        id: "cred",
        clientExtensionResults: {
          prf: { results: { first: "PRF-SECRET-SENTINEL" } },
        },
      },
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.body).toBe(
      JSON.stringify({
        action: "verify",
        response: { id: "cred", clientExtensionResults: {} },
      })
    );
    expect(String(request.body)).not.toContain("PRF-SECRET-SENTINEL");
  });
});
