import { assertCredentialsEmailVerifiedForSignIn } from "@/modules/account/lib/account-policy-config";
import { TWO_FACTOR_LOGIN_CHALLENGE_TTL_MS } from "@/modules/two-factor/lib/constants";
import type { SecureAuthContext } from "@/core/create-secure-auth-context";
import type { SecureAuthRepositories } from "@/core/create-repositories";
import type { RateLimitApi } from "@/modules/rate-limit/index";
import type { AuthLoginService } from "@/modules/auth/services/auth-login-service";
import type { AuthService } from "@/modules/auth/services/auth-service";
import type { TwoFactorService } from "@/modules/two-factor/services/two-factor-service";
import type { SecurityNotificationService } from "@/modules/security/notifications/security-notification-service";
import { parseUserAgentMetadata } from "@/modules/security/user-agent/metadata";
import { buildMagicLinkEmail, buildMagicLinkUrl } from "@/modules/email/templates/magic-link-template";

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

export const MAGIC_LINK_REQUEST_MESSAGE =
  "If that email is registered, a link has been sent.";

export const MAGIC_LINK_INVALID_MESSAGE = "Invalid or expired magic link.";

type MagicLinkServiceDeps = {
  config: SecureAuthContext["config"];
  ctx: SecureAuthContext;
  repos: SecureAuthRepositories;
  rateLimit: RateLimitApi;
  authLoginService: AuthLoginService;
  authService: AuthService;
  twoFactorService: TwoFactorService;
  securityNotificationService?: SecurityNotificationService;
};

export function createMagicLinkService(deps: MagicLinkServiceDeps) {
  const {
    config,
    ctx,
    repos,
    rateLimit,
    authLoginService,
    authService,
    twoFactorService,
    securityNotificationService,
  } = deps;

  async function issueMagicLinkToken(userId: string, email: string) {
    await repos.accountTokenRepository.revokeActiveTokensForUser(userId, "magic_link");
    const token = ctx.createOpaqueToken();
    const tokenHash = ctx.hashOpaqueToken(token);
    await repos.accountTokenRepository.create({
      userId,
      email,
      type: "magic_link",
      tokenHash,
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
    });
    return token;
  }

  return {
    async requestMagicLink(email: string, ip?: string) {
      const normalizedEmail = email.trim().toLowerCase();
      const emailScope = ctx.hashEmailForScope(normalizedEmail);

      await rateLimit.enforceRateLimit({
        operation: "auth.magic_link_request",
        userId: emailScope,
        ip,
        endpoint: "/api/auth/magic-link/request",
        keyMode: "email_ip",
      });

      const user = await repos.userRepository.findByEmail(normalizedEmail);
      if (!user) {
        return;
      }

      const token = await issueMagicLinkToken(user.id, user.email);
      const magicLinkUrl = buildMagicLinkUrl(config, token);
      const content = buildMagicLinkEmail(config, magicLinkUrl);
      await ctx.deliverAccountEmail({ to: user.email, ...content });
    },

    async verifyMagicLink(rawToken: string): Promise<{ userId: string } | null> {
      const tokenHash = ctx.hashOpaqueToken(rawToken);
      const row = await repos.accountTokenRepository.consumeValidToken(tokenHash, "magic_link");
      if (!row?.userId) {
        return null;
      }

      const user = await repos.userRepository.findById(row.userId);
      if (!user) {
        return null;
      }

      assertCredentialsEmailVerifiedForSignIn(user, config);
      return { userId: user.id };
    },

    async completeMagicLinkSignIn(
      userId: string,
      ip?: string,
      requestMetadata?: {
        userAgent?: string;
        ipMasked?: string;
      }
    ) {
      const user = await repos.userRepository.findById(userId);
      if (user) {
        const ua = requestMetadata?.userAgent
          ? parseUserAgentMetadata(requestMetadata.userAgent)
          : null;
        void securityNotificationService?.notifySecurityEvent({
          type: "magic_link_used",
          userId: user.id,
          userEmail: user.email,
          browser: ua?.browser,
          platform: ua?.platform,
          deviceType: ua?.deviceType,
          ipMasked: requestMetadata?.ipMasked,
        });
      }

      const twoFactorEnabled = await twoFactorService.isEnabledForUser(userId);
      if (twoFactorEnabled) {
        const challengeToken = ctx.createOpaqueToken();
        const challengeTokenHash = ctx.hashOpaqueToken(challengeToken);
        await repos.twoFactorRepository.createLoginChallenge({
          userId,
          challengeTokenHash,
          authProvider: "magic_link",
          expiresAt: new Date(Date.now() + TWO_FACTOR_LOGIN_CHALLENGE_TTL_MS),
        });

        return {
          requiresTwoFactor: true as const,
          challengeToken,
        };
      }

      const loginToken = await authLoginService.issueLoginToken(userId, "password");
      await authService.recordLoginSuccess(userId, "magic_link");
      return {
        requiresTwoFactor: false as const,
        loginToken,
        redirectTo: config.auth.afterLoginPath,
      };
    },
  };
}

export type MagicLinkService = ReturnType<typeof createMagicLinkService>;
