import { safeLogger } from "@/lib/logger";
import { NextResponse } from "next/server";

const MAX_EVENTS = 50;
const traceEvents: AuthTraceEvent[] = [];

export type AuthTraceEvent = {
  at: string;
  step: string;
  meta?: Record<string, string | boolean | number>;
};

export function isAuthTraceEnabled(): boolean {
  return process.env.AUTH_DEBUG_TRACE === "true";
}

export function traceAuth(step: string, meta?: Record<string, string | boolean | number>) {
  if (!isAuthTraceEnabled()) return;

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

export function getAuthTraceEvents(): AuthTraceEvent[] {
  return [...traceEvents];
}

/** Clears in-memory trace events. Intended for unit tests only. */
export function resetAuthTraceEventsForTests() {
  traceEvents.length = 0;
}

export function withAuthTraceHeader(
  response: Response,
  step: string,
  meta?: Record<string, string | boolean | number>
) {
  traceAuth(step, meta);
  response.headers.set("X-Auth-Trace", step);
  return response;
}

export function authTraceRedirect(
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
