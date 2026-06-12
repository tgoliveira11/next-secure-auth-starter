import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { passkeyRepository } from "@/server/repositories/passkey-repository";
import { auditRepository } from "@/server/repositories/audit-repository";
import { userRepository } from "@/server/repositories/user-repository";
import { enforceRateLimit } from "@/server/policies/rate-limit";
import {
  getWebAuthnOrigins,
  getWebAuthnRpId,
  toPasskeyVerificationErrorMessage,
} from "@/lib/passkey/webauthn-config";
import { authLoginService } from "@/server/services/auth-login-service";
import { authService } from "@/server/services/auth-service";
import { assertCredentialsEmailVerifiedForSignIn } from "@/lib/account-policy-config";
import { ChallengeError, NotFoundError } from "@/server/services/passkey-service";
import { ValidationError } from "@/server/services/account-service";

const rpID = getWebAuthnRpId();
const origins = getWebAuthnOrigins();

async function resolveLoginCredentialAllowList(
  userId: string,
  preferredCredentialId?: string
): Promise<{ id: string; transports?: AuthenticatorTransport[] }[] | undefined> {
  const creds = await passkeyRepository.findByUserId(userId);
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

async function resolveLoginContext(input?: {
  email?: string;
  userId?: string;
  credentialId?: string;
}): Promise<{
  userId?: string;
  allowCredentials?: { id: string; transports?: AuthenticatorTransport[] }[];
}> {
  if (input?.credentialId) {
    const credential = await passkeyRepository.findByCredentialId(input.credentialId);
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
    const user = await userRepository.findById(input.userId);
    if (user) {
      return {
        userId: user.id,
        allowCredentials: await resolveLoginCredentialAllowList(user.id, input.credentialId),
      };
    }
  }

  if (input?.email) {
    const user = await userRepository.findByEmail(input.email);
    if (user) {
      return {
        userId: user.id,
        allowCredentials: await resolveLoginCredentialAllowList(user.id, input.credentialId),
      };
    }
  }

  return {};
}

export const passkeyLoginService = {
  async getLoginOptions(input?: {
    email?: string;
    userId?: string;
    credentialId?: string;
    ip?: string;
  }) {
    await enforceRateLimit({
      operation: "passkey.login",
      ip: input?.ip,
      endpoint: "/api/auth/passkey/login/options",
      keyMode: "ip",
    });

    if (input?.email) {
      const user = await userRepository.findByEmail(input.email);
      if (!user) {
        throw new NotFoundError("No account found for this email.");
      }

      const creds = await passkeyRepository.findByUserId(user.id);
      const hasSignInPasskey = creds.some((c) => c.signInEnabled);
      if (!hasSignInPasskey) {
        throw new ValidationError(
          "This account does not have a passkey yet. Sign in with your password or social account, then add one in Security settings."
        );
      }
    }

    const { userId, allowCredentials } = await resolveLoginContext(input);

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: "required",
    });

    await passkeyRepository.storeChallenge({
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
      challengeRecord = await passkeyRepository.consumeValidChallenge(
        clientData.challenge,
        "login"
      );
    } catch {
      throw new ChallengeError("Invalid or expired challenge");
    }

    const credential = await passkeyRepository.findByCredentialId(response.id);
    if (!credential || !credential.signInEnabled) {
      await auditRepository.record("passkey_login_failed", challengeRecord.userId ?? undefined, {
        reason: "unknown_or_sign_in_disabled",
      });
      throw new NotFoundError("This passkey is not registered for sign-in.");
    }

    await enforceRateLimit({
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
      await auditRepository.record("passkey_login_failed", credential.userId, {
        reason: "verification_failed",
      });
      throw new ChallengeError(toPasskeyVerificationErrorMessage(error));
    }

    if (!verification.verified) {
      await auditRepository.record("passkey_login_failed", credential.userId, {
        reason: "not_verified",
      });
      throw new ChallengeError("Passkey sign-in failed. Try again.");
    }

    await passkeyRepository.updateCounter(
      credential.credentialId,
      String(verification.authenticationInfo.newCounter)
    );
    await passkeyRepository.updateLastUsedAt(credential.credentialId);

    const user = await userRepository.findById(credential.userId);
    if (!user) {
      throw new NotFoundError("This passkey is not registered for sign-in.");
    }
    assertCredentialsEmailVerifiedForSignIn(user);

    const loginToken = await authLoginService.issueLoginToken(credential.userId, "passkey");
    await authService.recordLoginSuccess(credential.userId, "passkey");
    await auditRepository.record("passkey_login_success", credential.userId);

    return {
      loginToken,
      userId: credential.userId,
      credentialId: credential.credentialId,
    };
  },
};
