import { NextResponse } from "next/server";
import { getPasswordPolicyConfig } from "@/modules/security/password-policy/index";

export async function GET() {
  return NextResponse.json(getPasswordPolicyConfig());
}