import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { assertCredentialsEmailVerifiedForSignIn } from "@/modules/account/lib/account-policy-config";
import { ChallengeError, NotFoundError } from "@/modules/passkeys/services/passkey-service";
import { ValidationError } from "@/modules/account/lib/account-errors";
import { TWO_FACTOR_LOGIN_CHALLENGE_TTL_MS } from "@/modules/two-factor/lib/constants";
import type { SecureAuthContext } from "@/core/create-secure-auth-context";
import type { SecureAuthRepositories } from "@/core/create-repositories";
import type { RateLimitApi } from "@/modules/rate-limit/index";
import type { AuthLoginService } from "@/modules/auth/services/auth-login-service";
import type { AuthService } from "@/modules/auth/services/auth-service";
import type { TwoFactorService } from "@/modules/two-factor/services/two-factor-service";

type PasskeyLoginServiceDeps = {
  config: SecureAuthContext["config"];
  ctx: SecureAuthContext;
  repos: SecureAuthRepositories;
  rateLimit: RateLimitApi;
  authLoginService: AuthLoginService;
  authService: AuthService;
  twoFactorService: TwoFactorService;
};

async function resolveLoginCredentialAllowList(
  repos: SecureAuthRepositories,
  userId: string,
  preferredCredentialId?: string
): Promise<{ id: string; transports?: AuthenticatorTransport[] }[] | undefined> {
  const creds = await repos.passkeyRepository.findByUserId(userId);
  const signInCreds = creds.filter((c) => c.signInEnabled);
  if (signInCreds.length === 0) return undefined;

  if (preferredCredentialId) {
    const preferred = signInCreds.find((c) => c.credentialId === preferredCredentialId);
    if (preferred) {
      return [
        {
          id: preferred.credentialId,
          transports: (preferred.transports as AuthenticatorTransport[]) ?? undefined,
        },
      ];
    }
  }

  return signInCreds.map((c) => ({
    id: c.credentialId,
    transports: (c.transports as AuthenticatorTransport[]) ?? undefined,
  }));
}

async function resolveLoginContext(
  repos: SecureAuthRepositories,
  input?: {
    email?: string;
    userId?: string;
    credentialId?: string;
  }
): Promise<{
  userId?: string;
  allowCredentials?: { id: string; transports?: AuthenticatorTransport[] }[];
}> {
  if (input?.credentialId) {
    const credential = await repos.passkeyRepository.findByCredentialId(input.credentialId);
    if (credential?.signInEnabled) {
      return {
        userId: credential.userId,
        allowCredentials: [
          {
            id: credential.credentialId,
            transports: (credential.transports as AuthenticatorTransport[]) ?? undefined,
          },
        ],
      };
    }
  }

  if (input?.userId) {
    const user = await repos.userRepository.findById(input.userId);
    if (user) {
      return {
        userId: user.id,
        allowCredentials: await resolveLoginCredentialAllowList(repos, user.id, input.credentialId),
      };
    }
  }

  if (input?.email) {
    const user = await repos.userRepository.findByEmail(input.email);
    if (user) {
      return {
        userId: user.id,
        allowCredentials: await resolveLoginCredentialAllowList(repos, user.id, input.credentialId),
      };
    }
  }

  return {};
}

export function createPasskeyLoginService(deps: PasskeyLoginServiceDeps) {
  const { config, ctx, repos, rateLimit, authLoginService, authService, twoFactorService } = deps;
  const rpID = ctx.getWebAuthnRpId();
  const origins = ctx.getWebAuthnOrigins();

  return {
    async getLoginOptions(input?: {
      email?: string;
      userId?: string;
      credentialId?: string;
      ip?: string;
    }) {
      await rateLimit.enforceRateLimit({
        operation: "passkey.login",
        ip: input?.ip,
        endpoint: "/api/auth/passkey/login/options",
        keyMode: "ip",
      });

      if (input?.email) {
        const user = await repos.userRepository.findByEmail(input.email);
        if (!user) {
          throw new NotFoundError("No account found for this email.");
        }

        const creds = await repos.passkeyRepository.findByUserId(user.id);
        const hasSignInPasskey = creds.some((c) => c.signInEnabled);
        if (!hasSignInPasskey) {
          throw new ValidationError(
            "This account does not have a passkey yet. Sign in with your password or social account, then add one in Security settings."
          );
        }
      }

      const { userId, allowCredentials } = await resolveLoginContext(repos, input);

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials,
        userVerification: "required",
      });

      await repos.passkeyRepository.storeChallenge({
        userId,
        challenge: options.challenge,
        type: "login",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      return { options };
    },

    async verifyLogin(response: AuthenticationResponseJSON, ip?: string) {
      const clientData = JSON.parse(
        Buffer.from(response.response.clientDataJSON, "base64url").toString()
      );

      let challengeRecord;
      try {
        challengeRecord = await repos.passkeyRepository.consumeValidChallenge(
          clientData.challenge,
          "login"
        );
      } catch {
        throw new ChallengeError("Invalid or expired challenge");
      }

      const credential = await repos.passkeyRepository.findByCredentialId(response.id);
      if (!credential || !credential.signInEnabled) {
        await repos.auditRepository.record("passkey_login_failed", challengeRecord.userId ?? undefined, {
          reason: "unknown_or_sign_in_disabled",
        });
        throw new NotFoundError("This passkey is not registered for sign-in.");
      }

      await rateLimit.enforceRateLimit({
        operation: "passkey.login",
        userId: credential.userId,
        ip,
        endpoint: "/api/auth/passkey/login/verify",
      });

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response,
          expectedChallenge: challengeRecord.challenge,
          expectedOrigin: origins,
          expectedRPID: rpID,
          credential: {
            id: credential.credentialId,
            publicKey: new Uint8Array(Buffer.from(credential.publicKey, "base64url")),
            counter: Number.parseInt(credential.counter, 10) || 0,
            transports: (credential.transports as AuthenticatorTransport[]) ?? undefined,
          },
        });
      } catch (error) {
        await repos.auditRepository.record("passkey_login_failed", credential.userId, {
          reason: "verification_failed",
        });
        throw new ChallengeError(ctx.toPasskeyVerificationErrorMessage(error));
      }

      if (!verification.verified) {
        await repos.auditRepository.record("passkey_login_failed", credential.userId, {
          reason: "not_verified",
        });
        throw new ChallengeError("Passkey sign-in failed. Try again.");
      }

      await repos.passkeyRepository.updateCounter(
        credential.credentialId,
        String(verification.authenticationInfo.newCounter)
      );
      await repos.passkeyRepository.updateLastUsedAt(credential.credentialId);

      const user = await repos.userRepository.findById(credential.userId);
      if (!user) {
        throw new NotFoundError("This passkey is not registered for sign-in.");
      }
      assertCredentialsEmailVerifiedForSignIn(user, config);

      await repos.auditRepository.record("passkey_login_success", credential.userId);

      const twoFactorEnabled = await twoFactorService.isEnabledForUser(credential.userId);
      if (twoFactorEnabled) {
        const challengeToken = ctx.createOpaqueToken();
        const challengeTokenHash = ctx.hashOpaqueToken(challengeToken);
        await repos.twoFactorRepository.createLoginChallenge({
          userId: credential.userId,
          challengeTokenHash,
          authProvider: "passkey",
          expiresAt: new Date(Date.now() + TWO_FACTOR_LOGIN_CHALLENGE_TTL_MS),
        });
        await repos.auditRepository.record("two_factor_login_required", credential.userId, {
          endpoint: "/api/auth/passkey/login/verify",
          provider: "passkey",
        });

        return {
          requiresTwoFactor: true as const,
          challengeToken,
          userId: credential.userId,
          credentialId: credential.credentialId,
        };
      }

      const loginToken = await authLoginService.issueLoginToken(credential.userId, "passkey");
      await authService.recordLoginSuccess(credential.userId, "passkey");

      return {
        requiresTwoFactor: false as const,
        loginToken,
        userId: credential.userId,
        credentialId: credential.credentialId,
      };
    },
  };
}

export type PasskeyLoginService = ReturnType<typeof createPasskeyLoginService>;
