import { NextResponse } from "next/server";
import { z } from "zod";
import { userRepository } from "@/modules/account/repositories/user-repository";
import { hashPassword } from "@/modules/security/policies/password-hashing";
import {
  assertAuthPasswordRequestMethod,
  assertPasswordNotInUrl,
  AuthPasswordTransportError,
} from "@/modules/security/policies/auth-password-input";
import { enforceRateLimit, RateLimitError } from "@/modules/rate-limit/index";
import { safeLogger } from "@/modules/security/logger/index";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { apiError } from "@/lib/api-helpers";
import { accountAuthService } from "@/modules/account/services/account-auth-service";
import { getSecureAuthConfig } from "@/core/secure-auth-runtime";
import { validatePasswordForSubmission } from "@/modules/security/password-policy/index";
import { ValidationError } from "@/modules/account/services/account-service";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

function registrationErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Registration failed";

  const message = error.message.toLowerCase();
  if (message.includes("database_url")) {
    return "Server misconfiguration: DATABASE_URL is not set.";
  }
  if (
    message.includes("connect") ||
    message.includes("econnrefused") ||
    message.includes("connection")
  ) {
    return "Database unavailable. Verify database connectivity and retry.";
  }
  if (message.includes("relation") && message.includes("does not exist")) {
    return "Database schema missing. Apply migrations for your consuming application.";
  }

  return "Registration failed. Please try again.";
}

export async function POST(request: Request) {
  try {
    assertAuthPasswordRequestMethod(request.method, new Set(["POST"]));
    assertPasswordNotInUrl(request.url);

    const ip = getClientIp(request);
    await enforceRateLimit({
      operation: "auth.register",
      ip,
      endpoint: "/api/auth/register",
    });

    const body = await request.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const existing = await userRepository.findByEmail(parsed.data.email);
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const { email, password } = parsed.data;

    const policyResult = validatePasswordForSubmission(password);
    if (!policyResult.valid) {
      throw new ValidationError(
        policyResult.assessment.messages[0] ?? "Password does not meet the configured policy."
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await userRepository.create({
      email,
      authProvider: "credentials",
      passwordHash,
    });

    const secureConfig = getSecureAuthConfig();
    const policy = secureConfig.accountPolicy ?? {
      sendVerificationOnRegister: true,
      requireEmailVerificationBeforeSignIn:
        secureConfig.auth.requireEmailVerificationBeforeSignIn,
    };
    if (policy.sendVerificationOnRegister) {
      await accountAuthService.sendVerificationEmailForUser(user.id, ip);
    }

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        requiresEmailVerification: policy.sendVerificationOnRegister,
        requireEmailVerificationBeforeSignIn: policy.requireEmailVerificationBeforeSignIn,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthPasswordTransportError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof RateLimitError) {
      return apiError(error, "/api/auth/register");
    }
    if (error instanceof ValidationError) {
      return apiError(error, "/api/auth/register");
    }
    safeLogger.error("Registration failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: registrationErrorMessage(error) },
      { status: 500 }
    );
  }
}