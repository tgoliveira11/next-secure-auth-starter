import { describe, it, expect } from "vitest";
import { buildRateLimitKey } from "../types";

describe("buildRateLimitKey", () => {
  it("builds email-scoped keys", () => {
    expect(
      buildRateLimitKey({
        operation: "auth.login",
        userId: "user-1",
        endpoint: "/login",
        keyMode: "email",
      })
    ).toBe("rate:auth.login:email:user-1:endpoint:/login");
  });

  it("builds ip-scoped keys", () => {
    expect(
      buildRateLimitKey({
        operation: "passkey.login",
        ip: "1.2.3.4",
        endpoint: "/api/auth/passkey/login/options",
        keyMode: "ip",
      })
    ).toBe("rate:passkey.login:ip:1.2.3.4:endpoint:/api/auth/passkey/login/options");
  });

  it("builds composite email+ip keys", () => {
    expect(
      buildRateLimitKey({
        operation: "auth.login",
        userId: "user-1",
        ip: "1.2.3.4",
        endpoint: "/login",
        keyMode: "email_ip",
      })
    ).toBe("rate:auth.login:email:user-1:ip:1.2.3.4:endpoint:/login");
  });

  it("defaults to email_ip when both userId and ip are present", () => {
    expect(
      buildRateLimitKey({
        operation: "auth.login",
        userId: "user-1",
        ip: "1.2.3.4",
      })
    ).toBe("rate:auth.login:email:user-1:ip:1.2.3.4:endpoint:default");
  });

  it("defaults to ip mode when only ip is present", () => {
    expect(
      buildRateLimitKey({
        operation: "passkey.login",
        ip: "1.2.3.4",
      })
    ).toBe("rate:passkey.login:ip:1.2.3.4:endpoint:default");
  });

  it("defaults to email mode when only userId is present", () => {
    expect(
      buildRateLimitKey({
        operation: "account.delete",
        userId: "user-1",
      })
    ).toBe("rate:account.delete:email:user-1:endpoint:default");
  });

  it("uses anonymous and unknown-ip placeholders when identifiers are missing", () => {
    expect(
      buildRateLimitKey({
        operation: "auth.register",
        keyMode: "email",
      })
    ).toBe("rate:auth.register:email:anonymous:endpoint:default");

    expect(
      buildRateLimitKey({
        operation: "auth.register",
        keyMode: "ip",
      })
    ).toBe("rate:auth.register:ip:unknown-ip:endpoint:default");
  });
});
