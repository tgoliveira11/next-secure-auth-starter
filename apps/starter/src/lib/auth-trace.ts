/** Edge-safe auth trace for starter middleware and pages (no package server graph). */

export function traceAuth(
  step: string,
  meta?: Record<string, string | boolean | number>
): void {
  if (process.env.AUTH_DEBUG_TRACE !== "true") return;
  console.info("auth-trace", { step, ...meta });
}
