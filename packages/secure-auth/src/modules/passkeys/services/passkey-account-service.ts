import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { ChallengeError, NotFoundError } from "@/modules/passkeys/services/passkey-service";
import type { SecureAuthContext } from "@/core/create-secure-auth-context";
import type { SecureAuthRepositories } from "@/core/create-repositories";
import type { RateLimitApi } from "@/modules/rate-limit/index";
import type { RunInTransaction } from "@/lib/db/transaction";

function defaultFriendlyName(deviceType?: string): string {
  if (deviceType === "singleDevice") return "This device";
  if (deviceType === "multiDevice") return "Synced passkey";
  return "Passkey";
}

type PasskeyAccountServiceDeps = {
  ctx: SecureAuthContext;
  repos: SecureAuthRepositories;
  rateLimit: RateLimitApi;
  runInTransaction: RunInTransaction;
};

export function createPasskeyAccountService(deps: PasskeyAccountServiceDeps) {
  const { ctx, repos, rateLimit, runInTransaction } = deps;
  const rpName = ctx.getWebAuthnRpName();
  const rpID = ctx.getWebAuthnRpId();
  const origins = ctx.getWebAuthnOrigins();

  return {
    async listPasskeys(userId: string) {
      const credentials = await repos.passkeyRepository.findByUserId(userId);
      return credentials.map((cred) => ({
        id: cred.id,
        friendlyName: cred.friendlyName ?? defaultFriendlyName(),
        createdAt: cred.createdAt.toISOString(),
        lastUsedAt: cred.lastUsedAt?.toISOString() ?? null,
        signInEnabled: cred.signInEnabled,
      }));
    },

    async getRegistrationOptions(userId: string, userName: string, ip?: string) {
      await rateLimit.enforceRateLimit({
        operation: "passkey.register",
        userId,
        ip,
        endpoint: "/api/account/passkeys/register/options",
      });

      const existing = await repos.passkeyRepository.findByUserId(userId);
      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName,
        userID: new TextEncoder().encode(userId),
        attestationType: "none",
        excludeCredentials: existing.map((c) => ({
          id: c.credentialId,
          transports: (c.transports as AuthenticatorTransport[]) ?? undefined,
        })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
      });

      await repos.passkeyRepository.storeChallenge({
        userId,
        challenge: options.challenge,
        type: "registration",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      return options;
    },

    async verifyRegistration(
      userId: string,
      response: RegistrationResponseJSON,
      options?: { friendlyName?: string }
    ) {
      const clientData = JSON.parse(
        Buffer.from(response.response.clientDataJSON, "base64url").toString()
      );

      let challengeRecord;
      try {
        challengeRecord = await repos.passkeyRepository.consumeValidChallenge(
          clientData.challenge,
          "registration",
          userId
        );
      } catch {
        throw new ChallengeError("Invalid or expired challenge");
      }

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challengeRecord.challenge,
        expectedOrigin: origins,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new Error("Passkey registration failed");
      }

      const { credential, credentialDeviceType } = verification.registrationInfo;

      await runInTransaction(async (tx) => {
        await repos.passkeyRepository.createCredential(
          {
            userId,
            credentialId: credential.id,
            publicKey: Buffer.from(credential.publicKey).toString("base64url"),
            counter: String(credential.counter),
            transports: credential.transports,
            friendlyName: options?.friendlyName ?? defaultFriendlyName(credentialDeviceType),
            signInEnabled: true,
          },
          tx
        );

        await repos.auditRepository.record("passkey_added", userId, { context: "account" }, tx);
      });

      return {
        verified: true,
        credentialId: credential.id,
      };
    },

    async removePasskey(userId: string, credentialDbId: string) {
      const credential = await repos.passkeyRepository.findByIdForUser(credentialDbId, userId);
      if (!credential) {
        throw new NotFoundError("Passkey not found");
      }

      await runInTransaction(async (tx) => {
        await repos.passkeyRepository.revoke(credential.id, userId, tx);
        await repos.auditRepository.record(
          "passkey_removed",
          userId,
          { credentialId: credential.id },
          tx
        );
      });

      return { success: true };
    },
  };
}

export type PasskeyAccountService = ReturnType<typeof createPasskeyAccountService>;
