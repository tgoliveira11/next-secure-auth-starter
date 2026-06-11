import { NextResponse } from "next/server";
import { getPasswordPolicyConfig } from "@/lib/password-policy";

export async function GET() {
  return NextResponse.json(getPasswordPolicyConfig());
}
