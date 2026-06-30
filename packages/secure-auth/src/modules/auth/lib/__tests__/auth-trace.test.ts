import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthTraceApi } from "../auth-trace";
import type { SecureAuthConfig } from "@/core/types";

function baseConfig(overrides: Partial<SecureAuthConfig> = {}): SecureAuthConfig {
  return {
    auth: {
      afterLoginPath: "/dashboard",
      afterLogoutPath: "/login",
      requireEmailVerificationBeforeSignIn: false,
      nextAuthSecret: "test-secret",
      twoFactorEncryptionKey: "test-key",
    },
    ...overrides,
  } as SecureAuthConfig;
}

describe("createAuthTraceApi", () => {
  it("does not record events when tracing is disabled", () => {
    const api = createAuthTraceApi(baseConfig());
    api.traceAuth("login.start", { email: "user@example.com" });
    expect(api.getAuthTraceEvents()).toEqual([]);
  });

  it("records and redacts sensitive metadata when enabled", () => {
    const api = createAuthTraceApi(baseConfig({ debug: { authTrace: true } }));
    api.traceAuth("login.start", {
      email: "user@example.com",
      password: "secret",
      token: "abc",
    });
    const events = api.getAuthTraceEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.step).toBe("login.start");
    expect(events[0]?.meta).toEqual({
      email: "user@example.com",
      password: "[redacted]",
      token: "[redacted]",
    });
  });

  it("caps stored events at 50", () => {
    const api = createAuthTraceApi(baseConfig({ debug: { authTrace: true } }));
    for (let i = 0; i < 55; i += 1) {
      api.traceAuth(`step-${i}`);
    }
    expect(api.getAuthTraceEvents()).toHaveLength(50);
    expect(api.getAuthTraceEvents()[0]?.step).toBe("step-54");
  });

  it("sets X-Auth-Trace header on responses", () => {
    const api = createAuthTraceApi(baseConfig({ debug: { authTrace: true } }));
    const response = new Response(null, { status: 200 });
    api.withAuthTraceHeader(response, "login.complete");
    expect(response.headers.get("X-Auth-Trace")).toBe("login.complete");
  });

  it("redirects with trace header", () => {
    const api = createAuthTraceApi(baseConfig({ debug: { authTrace: true } }));
    const response = api.authTraceRedirect(
      new Request("http://localhost/login"),
      "/dashboard",
      "login.redirect"
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("X-Auth-Trace")).toBe("login.redirect");
  });

  it("resetAuthTraceEventsForTests clears events", () => {
    const api = createAuthTraceApi(baseConfig({ debug: { authTrace: true } }));
    api.traceAuth("step");
    api.resetAuthTraceEventsForTests();
    expect(api.getAuthTraceEvents()).toEqual([]);
  });
});
