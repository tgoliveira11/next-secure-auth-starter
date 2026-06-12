import type { SecureAuthContext } from "@/core/create-secure-auth-context";
import type { SecureAuthRepositories } from "@/core/create-repositories";
import type { RateLimitApi } from "@/modules/rate-limit/index";

type AuthServiceDeps = {
  ctx: SecureAuthContext;
  repos: SecureAuthRepositories;
  rateLimit: RateLimitApi;
};

export function createAuthService(deps: AuthServiceDeps) {
  const { ctx, repos, rateLimit } = deps;

  return {
    async recordLoginFailure(email: string) {
      const user = await repos.userRepository.findByEmail(email);
      await repos.auditRepository.record("login_failure", user?.id, {
        endpoint: "/api/auth/callback/credentials",
        errorCode: "invalid_credentials",
      });
    },

    async recordLoginSuccess(userId: string, provider: string) {
      await repos.auditRepository.record("login_success", userId, {
        provider,
        endpoint: "/api/auth/callback",
      });
    },

    async assertLoginAllowed(email: string, ip?: string) {
      const normalizedEmail = email.toLowerCase();
      const endpoint = "/api/auth/callback/credentials";

      await rateLimit.enforceRateLimit({
        operation: "auth.login",
        userId: normalizedEmail,
        endpoint,
        keyMode: "email",
      });

      if (ip) {
        await rateLimit.enforceRateLimit({
          operation: "auth.login",
          ip,
          endpoint,
          keyMode: "ip",
        });
        await rateLimit.enforceRateLimit({
          operation: "auth.login",
          userId: normalizedEmail,
          ip,
          endpoint,
          keyMode: "email_ip",
        });
      }
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
