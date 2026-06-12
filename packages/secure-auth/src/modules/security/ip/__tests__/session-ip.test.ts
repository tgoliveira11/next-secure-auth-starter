import { describe, it, expect } from "vitest";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import { hashIp, maskIp } from "@/modules/security/ip/session-ip";

describe("session IP utilities", () => {
  const config = buildTestSecureAuthConfig();

  it("masks IPv4 addresses", () => {
    expect(maskIp("187.45.12.99")).toBe("187.45.12.xxx");
  });

  it("masks unknown IPs safely", () => {
    expect(maskIp("unknown-ip")).toBe("partially hidden");
  });

  it("hashes IPs without returning the raw value", () => {
    const hash = hashIp(config, "192.168.1.10");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("192.168.1.10");
  });

  it("masks IPv6 addresses", () => {
    expect(maskIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toContain("xxx");
  });

  it("masks malformed values safely", () => {
    expect(maskIp("not-an-ip")).toBe("partially hidden");
    expect(maskIp("1.2.3")).toBe("partially hidden");
  });
});
