import { describe, it, expect } from "vitest";
import { requireSameOriginRequest, SameOriginError } from "@/modules/security/policies/same-origin";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";

const config = buildTestSecureAuthConfig({
  app: { name: "Test", slug: "test", baseUrl: "http://localhost:3001" },
  webauthn: { rpId: "localhost", rpName: "Test", origin: "http://localhost:3001" },
});

describe("requireSameOriginRequest", () => {
  it("allows matching Origin header", () => {
    const request = new Request("http://localhost:3001/api/account", {
      method: "POST",
      headers: { Origin: "http://localhost:3001" },
    });
    expect(() => requireSameOriginRequest(request, config)).not.toThrow();
  });

  it("rejects cross-origin requests", () => {
    const request = new Request("http://localhost:3001/api/account", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
    });
    expect(() => requireSameOriginRequest(request, config)).toThrow(SameOriginError);
  });

  it("allows Referer fallback when Origin is absent", () => {
    const request = new Request("http://localhost:3001/api/account", {
      method: "POST",
      headers: { Referer: "http://localhost:3001/settings/security" },
    });
    expect(() => requireSameOriginRequest(request, config)).not.toThrow();
  });

  it("skips validation when disabled in config", () => {
    const disabled = buildTestSecureAuthConfig({
      security: { sameOriginProtection: { enabled: false } },
    });
    const request = new Request("http://localhost:3001/api/account", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
    });
    expect(() => requireSameOriginRequest(request, disabled)).not.toThrow();
  });

  it("rejects when neither Origin nor Referer match", () => {
    const request = new Request("http://localhost:3001/api/account", {
      method: "POST",
      headers: { Referer: "https://evil.example/page" },
    });
    expect(() => requireSameOriginRequest(request, config)).toThrow(SameOriginError);
  });

  it("throws when enabled but no allowed origins are configured", () => {
    const empty = buildTestSecureAuthConfig({
      app: { name: "Test", slug: "test", baseUrl: "not-a-url" },
      webauthn: { rpId: "localhost", rpName: "Test", origin: "not-a-url" },
      security: { sameOriginProtection: { enabled: true, allowedOrigins: [] } },
    });
    const request = new Request("http://localhost/api/account", {
      method: "POST",
      headers: { Origin: "http://localhost" },
    });
    expect(() => requireSameOriginRequest(request, empty)).toThrow(SameOriginError);
  });

  it("rejects invalid Origin header values", () => {
    const request = new Request("http://localhost:3001/api/account", {
      method: "POST",
      headers: { Origin: "javascript:alert(1)" },
    });
    expect(() => requireSameOriginRequest(request, config)).toThrow(SameOriginError);
  });
});
