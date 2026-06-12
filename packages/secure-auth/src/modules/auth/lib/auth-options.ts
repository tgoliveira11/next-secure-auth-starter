import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { safeLogger } from "@/modules/security/logger/index";
import { evaluateOAuthSignIn } from "@/modules/auth/lib/oauth-sign-in-policy";
import { createMicrosoftAzureAdProvider } from "@/modules/auth/lib/microsoft-azure-ad-provider";
import {
  isValidMicrosoftApplicationClientId,
  isValidMicrosoftTenantId,
} from "@/modules/auth/lib/microsoft-provider-config";
import { credentialsSignInRequiresEmailVerification } from "@/modules/account/lib/account-policy-config";
import type { SecureAuthConfig } from "@/core/types";
import type { SecureAuthRepositories } from "@/core/create-repositories";
import type { AuthService } from "@/modules/auth/services/auth-service";
import type { AuthLoginService } from "@/modules/auth/services/auth-login-service";
import type { TwoFactorService } from "@/modules/two-factor/services/two-factor-service";
import type { AccountSessionService } from "@/modules/sessions/services/account-session-service";

export type AuthOptionsDeps = {
  config: SecureAuthConfig;
  repos: SecureAuthRepositories;
  authService: AuthService;
  authLoginService: AuthLoginService;
  twoFactorService: TwoFactorService;
  accountSessionService: AccountSessionService;
};

function resolveMicrosoftProvider(config: SecureAuthConfig) {
  const ms = config.oauth?.microsoft;
  if (!ms?.clientId || !ms.clientSecret) return null;
  if (!isValidMicrosoftApplicationClientId(ms.clientId)) {
    safeLogger.warn("Microsoft OAuth provider disabled due to invalid configuration", {
      errorCode: "invalid_client_id_format",
      endpoint: "auth-options",
    });
    return null;
  }
  const tenantId = ms.tenantId?.trim() || "common";
  if (!isValidMicrosoftTenantId(tenantId)) {
    safeLogger.warn("Microsoft OAuth provider disabled due to invalid configuration", {
      errorCode: "invalid_tenant_id_format",
      endpoint: "auth-options",
    });
    return null;
  }
  return { clientId: ms.clientId, clientSecret: ms.clientSecret, tenantId };
}

export function createAuthOptions(deps: AuthOptionsDeps): NextAuthOptions {
  const {
    config,
    repos,
    authService,
    authLoginService,
    twoFactorService,
    accountSessionService,
  } = deps;
  const microsoftProviderEnv = resolveMicrosoftProvider(config);
  const signInPath = config.ui?.paths?.login ?? "/login";

  return {
    secret: config.auth.nextAuthSecret,
    session: { strategy: "jwt" },
    pages: {
      signIn: signInPath,
    },
    events: {
      async signOut(message) {
        const token = "token" in message ? message.token : undefined;
        const userId = typeof token?.sub === "string" ? token.sub : undefined;
        const sessionId = typeof token?.sid === "string" ? token.sid : undefined;
        if (!userId) return;
        try {
          await accountSessionService.revokeOnSignOut(userId, sessionId);
        } catch {
          safeLogger.warn("Account session revoke on sign-out skipped", {
            errorCode: "session_revoke_on_signout_failed",
            endpoint: "signout-event",
          });
        }
      },
    },
    providers: [
      ...(config.oauth?.google
        ? [
            GoogleProvider({
              clientId: config.oauth.google.clientId,
              clientSecret: config.oauth.google.clientSecret,
            }),
          ]
        : []),
      ...(config.oauth?.apple
        ? [
            AppleProvider({
              clientId: config.oauth.apple.clientId,
              clientSecret: config.oauth.apple.clientSecret,
            }),
          ]
        : []),
      ...(microsoftProviderEnv ? [createMicrosoftAzureAdProvider(microsoftProviderEnv)] : []),
      CredentialsProvider({
        id: "login-token",
        name: "LoginToken",
        credentials: {
          loginToken: { label: "Login Token", type: "text" },
        },
        async authorize(credentials) {
          if (!credentials?.loginToken) return null;
          const result = await authLoginService.consumeLoginToken(credentials.loginToken);
          if (!result) return null;
          return {
            id: result.user.id,
            email: result.user.email,
            authMethod: result.authMethod,
          };
        },
      }),
    ],
    callbacks: {
      async signIn({ user, account }) {
        if (account?.provider === "login-token") {
          if (!user.email) return false;
          const dbUser = await repos.userRepository.findByEmail(user.email);
          if (!dbUser) return false;
          await authService.recordLoginSuccess(dbUser.id, account.provider);
          return true;
        }

        const decision = evaluateOAuthSignIn({
          email: user.email,
          accountProvider: account?.provider,
          existingUser: user.email ? await repos.userRepository.findByEmail(user.email) : null,
        });

        if (decision.action === "reject") {
          return decision.redirectPath;
        }

        let dbUser = user.email ? await repos.userRepository.findByEmail(user.email) : null;

        if (decision.action === "create_user" && user.email) {
          dbUser = await repos.userRepository.create({
            email: user.email,
            authProvider: decision.authProvider,
          });
          await repos.userRepository.markEmailVerified(dbUser.id);
        } else if (decision.action === "allow_existing" && dbUser && decision.markEmailVerified) {
          await repos.userRepository.markEmailVerified(dbUser.id);
        }

        if (dbUser && account?.provider) {
          await authService.recordLoginSuccess(dbUser.id, account.provider);
        }

        return true;
      },
      async jwt({ token, user, account, trigger, session }) {
        if (user?.email) {
          const dbUser = await repos.userRepository.findByEmail(user.email);
          if (dbUser) {
            const issuedAtMs = typeof token.iat === "number" ? token.iat * 1000 : undefined;
            if (
              dbUser.passwordUpdatedAt &&
              issuedAtMs !== undefined &&
              issuedAtMs < dbUser.passwordUpdatedAt.getTime()
            ) {
              return { ...token, sub: undefined, sessionInvalidated: true };
            }
            token.sub = dbUser.id;
            token.email = dbUser.email;
            token.emailVerificationRequired = credentialsSignInRequiresEmailVerification(
              dbUser,
              config
            );
            if (account?.provider === "login-token") {
              token.twoFactorVerified = true;
              token.twoFactorPending = false;
            } else if (account) {
              const enabled = await twoFactorService.isEnabledForUser(dbUser.id);
              token.twoFactorVerified = !enabled;
              token.twoFactorPending = enabled;
            }
          }
        } else if (token.sub) {
          const dbUser = await repos.userRepository.findById(token.sub);
          const issuedAtMs = typeof token.iat === "number" ? token.iat * 1000 : undefined;
          if (
            dbUser?.passwordUpdatedAt &&
            issuedAtMs !== undefined &&
            issuedAtMs < dbUser.passwordUpdatedAt.getTime()
          ) {
            return { ...token, sub: undefined, sessionInvalidated: true };
          }
          if (dbUser) {
            token.email = dbUser.email;
            token.emailVerificationRequired = credentialsSignInRequiresEmailVerification(
              dbUser,
              config
            );
          }
        } else if (token.email && !token.sub) {
          const dbUser = await repos.userRepository.findByEmail(token.email);
          if (dbUser) token.sub = dbUser.id;
        }

        if (trigger === "update" && session?.twoFactorUpgradeToken && token.sub) {
          const verified = await twoFactorService.consumeSessionUpgradeToken(
            token.sub,
            session.twoFactorUpgradeToken
          );
          if (verified) {
            token.twoFactorVerified = true;
            token.twoFactorPending = false;
          }
        }

        if (account) token.provider = account.provider;
        if (token.twoFactorVerified === undefined) {
          token.twoFactorVerified = true;
        }

        const userId = typeof token.sub === "string" ? token.sub : undefined;
        let sessionJustCreated = false;

        try {
          if (account && userId) {
            const authMethod = accountSessionService.mapProviderToAuthMethod(
              account.provider,
              (user as { authMethod?: string } | undefined)?.authMethod
            );
            const sessionRow = await accountSessionService.createSession({
              userId,
              authMethod,
            });
            token.sid = sessionRow.id;
            sessionJustCreated = true;
          } else if (userId && !token.sid) {
            const sessionRow = await accountSessionService.createSession({
              userId,
              authMethod: accountSessionService.mapProviderToAuthMethod(
                typeof token.provider === "string" ? token.provider : undefined
              ),
            });
            token.sid = sessionRow.id;
            sessionJustCreated = true;
          }

          if (token.sid && userId) {
            if (!sessionJustCreated) {
              const active = await accountSessionService.assertSessionActive(
                token.sid as string,
                userId
              );
              if (!active) {
                return { ...token, sub: undefined, sessionInvalidated: true };
              }
            }
            await accountSessionService.touchSessionThrottled(token.sid as string, userId);
          }
        } catch {
          safeLogger.warn("Account session tracking skipped", {
            errorCode: "session_tracking_unavailable",
            endpoint: "jwt-callback",
          });
        }

        return token;
      },
      async session({ session, token }) {
        if (token.sessionInvalidated) {
          return { ...session, user: undefined, expires: new Date(0).toISOString() };
        }
        if (session.user && token.sub) {
          session.user.id = token.sub;
        }
        if (typeof token.sid === "string") {
          session.accountSessionId = token.sid;
        }
        session.twoFactorVerified = token.twoFactorVerified !== false;
        session.twoFactorPending =
          token.twoFactorPending === true && token.twoFactorVerified === false;
        return session;
      },
    },
  };
}
