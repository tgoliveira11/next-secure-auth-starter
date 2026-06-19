import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/modules/security/policies/password-hashing";
import {
  assertAuthPasswordRequestMethod,
  assertPasswordNotInUrl,
  AuthPasswordTransportError,
} from "@/modules/security/policies/auth-password-input";
import { RateLimitError } from "@/modules/rate-limit/index";
import { safeLogger } from "@/modules/security/logger/index";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { apiError } from "@/lib/api-helpers";
import { ValidationError } from "@/modules/account/services/account-service";
import { CaptchaVerificationError } from "@/modules/captcha/index";
import { verifyCaptcha } from "@/modules/captcha/services/turnstile-verifier";
import { CAPTCHA_TOKEN_FIELD } from "@/modules/captcha/lib/constants";
import { GENERIC_REGISTRATION_ERROR } from "@/modules/auth/lib/public-auth-messages";
import {
  BREACHED_PASSWORD_ERROR,
  checkPasswordBreached,
} from "@/modules/security/password-policy/hibp-checker";
import type { SecureAuthServices } from "@/core/types";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
  [CAPTCHA_TOKEN_FIELD]: z.string().optional(),
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

async function registerPost(request: Request, services: SecureAuthServices) {
  const { config, ctx, repos, rateLimit, accountAuthService } = services;

  try {
    assertAuthPasswordRequestMethod(request.method, new Set(["POST"]));
    assertPasswordNotInUrl(request.url);

    const ip = getClientIp(request);

    const body = await request.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await verifyCaptcha({
      config,
      token: parsed.data[CAPTCHA_TOKEN_FIELD],
      remoteIp: ip,
      action: "register",
    });

    await rateLimit.enforceRateLimit({
      operation: "auth.register",
      ip,
      endpoint: "/api/auth/register",
    });

    const existing = await repos.userRepository.findByEmail(parsed.data.email);
    if (existing) {
      await repos.auditRepository.record("registration_rejected", existing.id, {
        endpoint: "/api/auth/register",
        errorCode: "email_already_registered",
      });
      return NextResponse.json({ error: GENERIC_REGISTRATION_ERROR }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const policyResult = ctx.validatePasswordForSubmission(password);
    if (!policyResult.valid) {
      throw new ValidationError(
        policyResult.assessment.messages[0] ?? "Password does not meet the configured policy."
      );
    }

    if (await checkPasswordBreached(password, config)) {
      return NextResponse.json({ error: BREACHED_PASSWORD_ERROR }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const user = await repos.userRepository.create({
      email,
      authProvider: "credentials",
      passwordHash,
    });

    const policy = ctx.getAccountPolicyConfig();
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
    if (error instanceof CaptchaVerificationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
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

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => registerPost(request, services);
}
