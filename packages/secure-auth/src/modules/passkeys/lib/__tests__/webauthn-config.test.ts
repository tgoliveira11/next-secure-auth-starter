import { describe, it, expect } from "vitest";
import { getWebAuthnOrigins } from "../webauthn-config";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";

describe("getWebAuthnOrigins", () => {
  it("accepts localhost and 127.0.0.1 as aliases", () => {
    const config = buildTestSecureAuthConfig({
      app: { name: "Test", slug: "test", baseUrl: "http://localhost:3000" },
      webauthn: {
        rpId: "localhost",
        rpName: "Test",
        origin: "http://localhost:3000",
      },
    });

    expect(getWebAuthnOrigins(config).sort()).toEqual(
      ["http://127.0.0.1:3000", "http://localhost:3000"].sort()
    );
  });

  it("accepts apex and www as aliases when origin is apex", () => {
    const config = buildTestSecureAuthConfig({
      app: { name: "Test", slug: "test", baseUrl: "https://tgoliveira11.tech" },
      webauthn: {
        rpId: "tgoliveira11.tech",
        rpName: "Test",
        origin: "https://tgoliveira11.tech",
      },
    });

    expect(getWebAuthnOrigins(config).sort()).toEqual(
      ["https://tgoliveira11.tech", "https://www.tgoliveira11.tech"].sort()
    );
  });

  it("accepts apex and www as aliases when origin is www", () => {
    const config = buildTestSecureAuthConfig({
      app: { name: "Test", slug: "test", baseUrl: "https://www.tgoliveira11.tech" },
      webauthn: {
        rpId: "tgoliveira11.tech",
        rpName: "Test",
        origin: "https://www.tgoliveira11.tech",
      },
    });

    expect(getWebAuthnOrigins(config).sort()).toEqual(
      ["https://tgoliveira11.tech", "https://www.tgoliveira11.tech"].sort()
    );
  });

  it("merges explicit extra origins", () => {
    const config = buildTestSecureAuthConfig({
      webauthn: {
        rpId: "tgoliveira11.tech",
        rpName: "Test",
        origin: "https://tgoliveira11.tech",
        origins: ["https://ltg.tgoliveira11.tech"],
      },
    });

    expect(getWebAuthnOrigins(config)).toContain("https://ltg.tgoliveira11.tech");
    expect(getWebAuthnOrigins(config)).toContain("https://www.tgoliveira11.tech");
  });
});
