import { describe, it, expect } from "vitest";
import { getClientIp, resolveTrustForwardedHeaders } from "../request-ip";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";

describe("getClientIp", () => {
  it("returns unknown-ip when forwarded headers are not trusted", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.1" },
    });
    expect(getClientIp(request)).toBe("unknown-ip");
    expect(getClientIp(request, buildTestSecureAuthConfig())).toBe("unknown-ip");
  });

  it("honors X-Forwarded-For when trustForwardedHeaders is enabled", () => {
    const config = buildTestSecureAuthConfig({
      security: { trustForwardedHeaders: true },
    });
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(resolveTrustForwardedHeaders(config)).toBe(true);
    expect(getClientIp(request, config)).toBe("203.0.113.1");
  });
});
