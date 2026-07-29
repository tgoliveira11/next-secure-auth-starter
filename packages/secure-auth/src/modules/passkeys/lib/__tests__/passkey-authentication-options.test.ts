import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import {
  buildPasskeyAuthenticationOptions,
  normalizePasskeyAuthenticationTransports,
} from "../passkey-authentication-options";

vi.mock("@simplewebauthn/server", () => ({
  generateAuthenticationOptions: vi.fn(async (options) => ({
    challenge: "challenge",
    allowCredentials: options.allowCredentials,
    userVerification: options.userVerification,
  })),
}));

describe("passkey authentication options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers the local transport while retaining hybrid fallback and L3 hints", async () => {
    const options = await buildPasskeyAuthenticationOptions({
      rpID: "example.com",
      allowCredentials: [
        {
          id: "credential-id",
          transports: ["hybrid", "internal", "hybrid"],
        },
      ],
    });

    expect(generateAuthenticationOptions).toHaveBeenCalledWith({
      rpID: "example.com",
      allowCredentials: [
        { id: "credential-id", transports: ["internal", "hybrid"] },
      ],
      userVerification: "required",
    });
    expect(options).toMatchObject({
      allowCredentials: [
        { id: "credential-id", transports: ["internal", "hybrid"] },
      ],
      hints: ["client-device", "hybrid"],
      userVerification: "required",
    });
    expect(options).not.toHaveProperty("authenticatorAttachment");
  });

  it("keeps a hybrid-only credential available without inventing a local transport", async () => {
    const options = await buildPasskeyAuthenticationOptions({
      rpID: "example.com",
      allowCredentials: [{ id: "credential-id", transports: ["hybrid"] }],
    });

    expect(options).toMatchObject({
      allowCredentials: [{ id: "credential-id", transports: ["hybrid"] }],
      userVerification: "required",
    });
    expect(options).not.toHaveProperty("hints");
  });

  it("drops unknown transports and preserves undefined transport metadata", async () => {
    expect(normalizePasskeyAuthenticationTransports(["future", "future"])).toBeUndefined();
    expect(normalizePasskeyAuthenticationTransports(undefined)).toBeUndefined();

    const options = await buildPasskeyAuthenticationOptions({
      rpID: "example.com",
      allowCredentials: [
        { id: "unknown", transports: ["future"] },
        { id: "undefined", transports: undefined },
      ],
    });

    expect(options.allowCredentials).toEqual([
      { id: "unknown", transports: undefined },
      { id: "undefined", transports: undefined },
    ]);
    expect(options).not.toHaveProperty("hints");
  });
});
