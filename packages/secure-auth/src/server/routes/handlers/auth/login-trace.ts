import { NextResponse } from "next/server";
import { isAuthTraceRouteExposed } from "@/modules/auth/lib/auth-trace";
import type { SecureAuthServices } from "@/core/types";

async function loginTraceGet(services: SecureAuthServices) {
  const { authTrace } = services.ctx;

  if (!isAuthTraceRouteExposed(services.config)) {
    return NextResponse.json({ error: "Auth trace disabled" }, { status: 404 });
  }

  return NextResponse.json({ events: authTrace.getAuthTraceEvents() });
}

export function createGetHandler(services: SecureAuthServices) {
  return () => loginTraceGet(services);
}
