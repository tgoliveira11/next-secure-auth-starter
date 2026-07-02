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
import { resolveInitialUserStatus } from "@/modules/auth/lib/registration-policy";
import {
  EmailMismatchInviteCodeError,
  ExhaustedInviteCodeError,
  ExpiredInviteCodeError,
  InvalidInviteCodeError,
} from "@/modules/admin/services/invite-service";
import {
  BREACHED_PASSWORD_ERROR,
  checkPasswordBreached,
} from "@/modules/security/password-policy/hibp-checker";
import type { SecureAuthServices } from "@/core/types";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
  inviteCode: z.string().min(1).optional(),
  [CAPTCHA_TOKEN_FIELD]: z.string().optional(),
});

function registrationErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Registration failed. Please try again.";
  return "Registration failed. Please try again.";
}

async function registerPost(request: Request, services: SecureAuthServices) {
  const { config, ctx, repos, rateLimit, accountAuthService, inviteService } = services;

  try {
    assertAuthPasswordRequestMethod(request.method, new Set(["POST"]));
    assertPasswordNotInUrl(request.url);

    const ip = getClientIp(request, config);

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

    let inviteCodeId: string | undefined;
    if (inviteService.requiresCode()) {
      const code = parsed.data.inviteCode?.trim();
      if (!code) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      }
      const invite = await inviteService.validateCode(code, email);
      inviteCodeId = invite.id;
    }

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
      status: resolveInitialUserStatus(inviteService),
    });

    if (inviteCodeId) {
      await inviteService.consumeCode(inviteCodeId, user.id);
    }

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
        status: user.status,
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
    if (
      error instanceof InvalidInviteCodeError ||
      error instanceof ExpiredInviteCodeError ||
      error instanceof ExhaustedInviteCodeError ||
      error instanceof EmailMismatchInviteCodeError
    ) {
      return NextResponse.json({ error: GENERIC_REGISTRATION_ERROR }, { status: 400 });
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
