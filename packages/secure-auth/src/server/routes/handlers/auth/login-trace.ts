import { NextResponse } from "next/server";
import type { SecureAuthServices } from "@/core/types";

async function loginTraceGet(services: SecureAuthServices) {
  const { authTrace } = services.ctx;

  if (!authTrace.isAuthTraceEnabled()) {
    return NextResponse.json({ error: "Auth trace disabled" }, { status: 404 });
  }

  return NextResponse.json({ events: authTrace.getAuthTraceEvents() });
}

export function createGetHandler(services: SecureAuthServices) {
  return () => loginTraceGet(services);
}
