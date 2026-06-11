import { describe, it, expect } from "vitest";
import {
  sanitizeAuditMetadata,
  containsSensitiveText,
} from "@/server/policies/audit-sanitization";

describe("audit sanitization", () => {
  it("returns null for missing metadata", () => {
    expect(sanitizeAuditMetadata(undefined)).toBeNull();
  });

  it("allows safe metadata keys only", () => {
    expect(
      sanitizeAuditMetadata({
        deviceId: "device-1",
        method: "passkey",
        endpoint: "/api/account/passkeys",
        title: "should-be-dropped",
        token: "secret-token",
      })
    ).toEqual({
      deviceId: "device-1",
      method: "passkey",
      endpoint: "/api/account/passkeys",
    });
  });

  it("drops metadata values containing sensitive text", () => {
    expect(
      sanitizeAuditMetadata({
        endpoint: "failed with password=abc",
      })
    ).toBeNull();
  });

  it("detects sensitive text patterns", () => {
    expect(containsSensitiveText("password=abc")).toBe(true);
    expect(containsSensitiveText("reset-token-value")).toBe(true);
    expect(containsSensitiveText("/api/account")).toBe(false);
  });
});
