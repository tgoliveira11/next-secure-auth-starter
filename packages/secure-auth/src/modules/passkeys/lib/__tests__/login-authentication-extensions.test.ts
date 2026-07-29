import { describe, expect, it, vi } from "vitest";
import { resolveLoginAuthenticationExtensions } from "../login-authentication-extensions";

function buildConfig(
  callback?: (context: { userId: string; credentialIds: readonly string[] }) => unknown
) {
  return {
    webauthn: {
      getLoginAuthenticationExtensions: callback,
    },
  } as never;
}

describe("resolveLoginAuthenticationExtensions", () => {
  it("runs only for a resolved user with a non-empty credential allow-list", async () => {
    const callback = vi.fn();
    const config = buildConfig(callback);

    await expect(
      resolveLoginAuthenticationExtensions({ config, allowCredentials: [{ id: "cred-1" }] })
    ).resolves.toBeUndefined();
    await expect(
      resolveLoginAuthenticationExtensions({ config, userId: "user-1", allowCredentials: [] })
    ).resolves.toBeUndefined();

    expect(callback).not.toHaveBeenCalled();
  });

  it("provides frozen server-only identifiers and returns a detached JSON-safe copy", async () => {
    const extensionInput = {
      prf: { eval: { first: "base64url-salt" } },
    };
    const callback = vi.fn().mockImplementation((context) => {
      expect(Object.isFrozen(context)).toBe(true);
      expect(Object.isFrozen(context.credentialIds)).toBe(true);
      return extensionInput;
    });

    const result = await resolveLoginAuthenticationExtensions({
      config: buildConfig(callback),
      userId: "user-1",
      allowCredentials: [{ id: "cred-1" }, { id: "cred-2" }],
    });

    expect(callback).toHaveBeenCalledWith({
      userId: "user-1",
      credentialIds: ["cred-1", "cred-2"],
    });
    expect(result).toEqual(extensionInput);
    expect(result).not.toBe(extensionInput);
  });

  it.each([
    ["binary values", { prf: new Uint8Array([1, 2, 3]) }],
    ["cycles", (() => {
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;
      return cyclic;
    })()],
    ["non-finite numbers", { custom: Number.NaN }],
    ["forbidden keys", JSON.parse('{"__proto__":{"polluted":true}}')],
  ])("rejects %s instead of serializing unsafe extension input", async (_label, result) => {
    await expect(
      resolveLoginAuthenticationExtensions({
        config: buildConfig(() => result),
        userId: "user-1",
        allowCredentials: [{ id: "cred-1" }],
      })
    ).rejects.toThrow(TypeError);
  });

  it("rejects oversized extension input", async () => {
    await expect(
      resolveLoginAuthenticationExtensions({
        config: buildConfig(() => ({ custom: "x".repeat(17_000) })),
        userId: "user-1",
        allowCredentials: [{ id: "cred-1" }],
      })
    ).rejects.toThrow(/allowed size/);
  });
});
