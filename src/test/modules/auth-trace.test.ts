import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  authTraceRedirect,
  getAuthTraceEvents,
  isAuthTraceEnabled,
  resetAuthTraceEventsForTests,
  traceAuth,
  withAuthTraceHeader,
} from "@/modules/auth/lib/auth-trace";

describe("auth-trace", () => {
  const originalEnv = process.env.AUTH_DEBUG_TRACE;

  beforeEach(() => {
    process.env.AUTH_DEBUG_TRACE = "true";
    resetAuthTraceEventsForTests();
  });

  afterEach(() => {
    process.env.AUTH_DEBUG_TRACE = originalEnv;
    resetAuthTraceEventsForTests();
  });

  it("is disabled unless AUTH_DEBUG_TRACE is true", () => {
    process.env.AUTH_DEBUG_TRACE = "false";
    expect(isAuthTraceEnabled()).toBe(false);
    process.env.AUTH_DEBUG_TRACE = "true";
    expect(isAuthTraceEnabled()).toBe(true);
  });

  it("records trace events when enabled", () => {
    traceAuth("test_step", { ok: true });
    const events = getAuthTraceEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.step).toBe("test_step");
    expect(events[0]?.meta).toEqual({ ok: true });
  });

  it("does not record trace events when disabled", () => {
    process.env.AUTH_DEBUG_TRACE = "false";
    traceAuth("ignored_step");
    expect(getAuthTraceEvents()).toHaveLength(0);
  });

  it("adds X-Auth-Trace header to responses", () => {
    const response = withAuthTraceHeader(new Response(null, { status: 200 }), "response_step");
    expect(response.headers.get("X-Auth-Trace")).toBe("response_step");
  });

  it("redirects with X-Auth-Trace header", () => {
    const request = new Request("http://localhost/login");
    const response = authTraceRedirect(request, "/login/2fa?mode=credentials", "login_form_2fa", {
      challenge: true,
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/login/2fa?mode=credentials");
    expect(response.headers.get("X-Auth-Trace")).toBe("login_form_2fa");
    expect(getAuthTraceEvents()[0]?.step).toBe("login_form_2fa");
  });
});
