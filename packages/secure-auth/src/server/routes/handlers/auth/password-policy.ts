import { NextResponse } from "next/server";
import type { SecureAuthServices } from "@/core/types";

async function passwordPolicyGet(services: SecureAuthServices) {
  return NextResponse.json(services.ctx.getPasswordPolicyConfig());
}

export function createGetHandler(services: SecureAuthServices) {
  return () => passwordPolicyGet(services);
}
