import { safeLogger } from "@/modules/security/logger/index";
import { resolveAuthTraceEnabled } from "@/core/config-accessors.js";
import type { SecureAuthConfig } from "@/core/types.js";
import { NextResponse } from "next/server";

const MAX_EVENTS = 50;

export type AuthTraceEvent = {
  at: string;
  step: string;
  meta?: Record<string, string | boolean | number>;
};

export function isAuthTraceEnabled(config: SecureAuthConfig): boolean {
  return resolveAuthTraceEnabled(config);
}

export function createAuthTraceApi(config: SecureAuthConfig) {
  const traceEvents: AuthTraceEvent[] = [];

  function traceAuth(step: string, meta?: Record<string, string | boolean | number>) {
    if (!isAuthTraceEnabled(config)) return;

    const event: AuthTraceEvent = {
      at: new Date().toISOString(),
      step,
      meta,
    };
    traceEvents.unshift(event);
    if (traceEvents.length > MAX_EVENTS) {
      traceEvents.length = MAX_EVENTS;
    }

    safeLogger.info("auth-trace", { step, ...meta });
  }

  function getAuthTraceEvents(): AuthTraceEvent[] {
    return [...traceEvents];
  }

  function resetAuthTraceEventsForTests() {
    traceEvents.length = 0;
  }

  function withAuthTraceHeader(
    response: Response,
    step: string,
    meta?: Record<string, string | boolean | number>
  ) {
    traceAuth(step, meta);
    response.headers.set("X-Auth-Trace", step);
    return response;
  }

  function authTraceRedirect(
    request: Request,
    path: string,
    step: string,
    meta?: Record<string, string | boolean | number>
  ) {
    traceAuth(step, meta);
    const response = NextResponse.redirect(new URL(path, request.url), 303);
    response.headers.set("X-Auth-Trace", step);
    return response;
  }

  return {
    isAuthTraceEnabled: () => isAuthTraceEnabled(config),
    traceAuth,
    getAuthTraceEvents,
    resetAuthTraceEventsForTests,
    withAuthTraceHeader,
    authTraceRedirect,
  };
}

export type AuthTraceApi = ReturnType<typeof createAuthTraceApi>;
