import { NextResponse } from "next/server";
import { RateLimitError } from "@/modules/rate-limit/index.js";
import {
  PreferenceKeyLimitError,
  PreferenceConflictError,
  PreferenceNamespaceForbiddenError,
  PreferenceNotFoundError,
  PreferencesDisabledError,
} from "@/modules/preferences/lib/preferences-errors.js";
import { PreferenceValidationError } from "@/modules/preferences/lib/preference-limits.js";
import { apiError } from "@/lib/api-helpers.js";

export function handleUserPreferencesError(error: unknown, endpoint: string) {
  if (error instanceof PreferencesDisabledError) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (error instanceof PreferenceNamespaceForbiddenError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (error instanceof PreferenceNotFoundError) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (error instanceof PreferenceConflictError) {
    return NextResponse.json({ error: "Conflict" }, { status: 412 });
  }
  if (error instanceof PreferenceValidationError || error instanceof PreferenceKeyLimitError) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (error instanceof RateLimitError) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  return apiError(error, endpoint);
}

export function readPreferencesNamespaceParam(
  request: Request,
  defaultNamespace: string
): string | null {
  const url = new URL(request.url);
  const namespace = url.searchParams.get("namespace");
  return namespace === null ? defaultNamespace : namespace;
}
