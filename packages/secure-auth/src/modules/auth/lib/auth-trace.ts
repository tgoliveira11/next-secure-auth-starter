import { safeLogger } from "@/modules/security/logger/index";
import { resolveAuthTraceEnabled, resolveAuthTraceExposeRoute } from "@/core/config-accessors.js";
import type { SecureAuthConfig } from "@/core/types.js";
import { NextResponse } from "next/server";

const MAX_EVENTS = 50;

const SENSITIVE_KEY_PATTERN =
  /token|secret|password|cookie|jwt|totp|code|credential|captcha|authorization/i;

export type AuthTraceEvent = {
  at: string;
  step: string;
  meta?: Record<string, string | boolean | number>;
};

function redactTraceValue(key: string, value: string | boolean | number): string | boolean | number {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return "[redacted]";
  }
  if (typeof value === "string" && value.length > 64) {
    return "[redacted]";
  }
  return value;
}

function sanitizeTraceMeta(
  meta?: Record<string, string | boolean | number>
): Record<string, string | boolean | number> | undefined {
  if (!meta) return undefined;
  const sanitized: Record<string, string | boolean | number> = {};
  for (const [key, value] of Object.entries(meta)) {
    sanitized[key] = redactTraceValue(key, value);
  }
  return sanitized;
}

export function isAuthTraceEnabled(config: SecureAuthConfig): boolean {
  return resolveAuthTraceEnabled(config);
}

export function isAuthTraceRouteExposed(config: SecureAuthConfig): boolean {
  return resolveAuthTraceExposeRoute(config);
}

export function createAuthTraceApi(config: SecureAuthConfig) {
  const traceEvents: AuthTraceEvent[] = [];

  function traceAuth(step: string, meta?: Record<string, string | boolean | number>) {
    if (!isAuthTraceEnabled(config)) return;

    const event: AuthTraceEvent = {
      at: new Date().toISOString(),
      step,
      meta: sanitizeTraceMeta(meta),
    };
    traceEvents.unshift(event);
    if (traceEvents.length > MAX_EVENTS) {
      traceEvents.length = MAX_EVENTS;
    }

    safeLogger.info("auth-trace", { step, ...event.meta });
  }

  function getAuthTraceEvents(): AuthTraceEvent[] {
    return traceEvents.map((event) => ({
      ...event,
      meta: event.meta ? { ...sanitizeTraceMeta(event.meta)! } : undefined,
    }));
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
    isAuthTraceRouteExposed: () => isAuthTraceRouteExposed(config),
    traceAuth,
    getAuthTraceEvents,
    resetAuthTraceEventsForTests,
    withAuthTraceHeader,
    authTraceRedirect,
  };
}

export type AuthTraceApi = ReturnType<typeof createAuthTraceApi>;
