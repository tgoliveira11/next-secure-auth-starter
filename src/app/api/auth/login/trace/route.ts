import { NextResponse } from "next/server";
import { getAuthTraceEvents, isAuthTraceEnabled } from "@/modules/auth/lib/auth-trace";

export async function GET() {
  if (!isAuthTraceEnabled()) {
    return NextResponse.json({ error: "Auth trace disabled" }, { status: 404 });
  }

  return NextResponse.json({ events: getAuthTraceEvents() });
}
