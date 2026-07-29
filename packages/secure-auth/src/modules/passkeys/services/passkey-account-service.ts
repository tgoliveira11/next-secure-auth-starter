import {
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { ChallengeError, NotFoundError } from "@/modules/passkeys/services/passkey-service";
import {
  toAccountPasskeyListItem,
  assertRemovableFromAccountSettings,
  toSignInExcludeCredentials,
  assertMayEnableAccountSignIn,
} from "@/modules/passkeys/lib/passkey-capabilities";
import { resolvePasskeyCounterAdvance } from "@/modules/passkeys/lib/passkey-counter";
import {
  buildPasskeyAuthenticationOptions,
} from "@/modules/passkeys/lib/passkey-authentication-options";
import type { SecureAuthContext } from "@/core/create-secure-auth-context";
import type { SecureAuthRepositories } from "@/core/create-repositories";
import type { RateLimitApi } from "@/modules/rate-limit/index";
import type { RunInTransaction } from "@/lib/db/transaction";

function defaultFriendlyName(deviceType?: string): string {
  if (deviceType === "singleDevice") return "This device";
  if (deviceType === "multiDevice") return "Synced passkey";
  return "Passkey";
}

function signInCapabilityChallengeType(credentialDbId: string): string {
  return `sign_in_capability_enable:${credentialDbId}`;
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
      return credentials.map((cred) =>
        toAccountPasskeyListItem(
          {
            id: cred.id,
            credentialId: cred.credentialId,
            friendlyName: cred.friendlyName,
            createdAt: cred.createdAt,
            lastUsedAt: cred.lastUsedAt,
            signInEnabled: cred.signInEnabled,
            vaultUnlockEnabled: cred.vaultUnlockEnabled,
          },
          defaultFriendlyName()
        )
      );
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
        excludeCredentials: toSignInExcludeCredentials(existing),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "required",
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
        requireUserVerification: true,
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
            vaultUnlockEnabled: false,
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

    async getSignInCapabilityOptions(userId: string, credentialDbId: string, ip?: string) {
      await rateLimit.enforceRateLimit({
        operation: "passkey.authenticate",
        userId,
        ip,
        endpoint: "/api/account/passkeys/:id/enable-sign-in/options",
      });

      const credential = await repos.passkeyRepository.findByIdForUser(credentialDbId, userId);
      if (!credential) {
        throw new NotFoundError("Passkey not found");
      }
      assertMayEnableAccountSignIn(credential);

      const options = await buildPasskeyAuthenticationOptions({
        rpID,
        allowCredentials: [
          {
            id: credential.credentialId,
            transports: (credential.transports as AuthenticatorTransport[]) ?? undefined,
          },
        ],
      });

      await repos.passkeyRepository.storeChallenge({
        userId,
        challenge: options.challenge,
        type: signInCapabilityChallengeType(credential.id),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      return { options };
    },

    async verifySignInCapability(
      userId: string,
      credentialDbId: string,
      response: AuthenticationResponseJSON,
      ip?: string
    ) {
      const credential = await repos.passkeyRepository.findByIdForUser(credentialDbId, userId);
      if (!credential) {
        throw new NotFoundError("Passkey not found");
      }
      assertMayEnableAccountSignIn(credential);
      if (response.id !== credential.credentialId) {
        throw new ChallengeError("Passkey capability verification failed");
      }

      await rateLimit.enforceRateLimit({
        operation: "passkey.authenticate",
        userId,
        ip,
        endpoint: "/api/account/passkeys/:id/enable-sign-in/verify",
      });

      const clientData = JSON.parse(
        Buffer.from(response.response.clientDataJSON, "base64url").toString()
      );
      let challengeRecord;
      try {
        challengeRecord = await repos.passkeyRepository.consumeValidChallenge(
          clientData.challenge,
          signInCapabilityChallengeType(credential.id),
          userId
        );
      } catch {
        throw new ChallengeError("Invalid or expired challenge");
      }

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response,
          expectedChallenge: challengeRecord.challenge,
          expectedOrigin: origins,
          expectedRPID: rpID,
          requireUserVerification: true,
          credential: {
            id: credential.credentialId,
            publicKey: new Uint8Array(Buffer.from(credential.publicKey, "base64url")),
            counter: Number(credential.counter),
            transports: (credential.transports as AuthenticatorTransport[]) ?? undefined,
          },
        });
      } catch (error) {
        throw new ChallengeError(ctx.toPasskeyVerificationErrorMessage(error));
      }

      if (!verification.verified) {
        throw new ChallengeError("Passkey capability verification failed");
      }

      const counterPlan = resolvePasskeyCounterAdvance(
        credential.counter,
        verification.authenticationInfo.newCounter
      );
      if (counterPlan.status === "invalid") {
        throw new ChallengeError("Passkey capability verification failed");
      }

      await runInTransaction(async (tx) => {
        const counterAdvance = await repos.passkeyRepository.advanceCounter(
          credential.credentialId,
          counterPlan.expectedCounter,
          counterPlan.nextCounter,
          credential.counterRevision,
          tx
        );
        if (counterAdvance === "conflict") {
          throw new ChallengeError("Passkey capability verification failed");
        }

        const updated = await repos.passkeyRepository.updateCredentialFlags(
          credential.id,
          userId,
          { signInEnabled: true },
          tx
        );
        if (!updated) {
          throw new ChallengeError("Passkey capability verification failed");
        }
        await repos.passkeyRepository.updateLastUsedAt(credential.credentialId, tx);
        await repos.auditRepository.record(
          "passkey_added",
          userId,
          { context: "sign_in_capability_enabled", credentialId: credential.id },
          tx
        );
      });

      return {
        verified: true as const,
        credentialId: credential.credentialId,
        signInEnabled: true as const,
      };
    },

    async removePasskey(userId: string, credentialDbId: string) {
      const credential = await repos.passkeyRepository.findByIdForUser(credentialDbId, userId);
      if (!credential) {
        throw new NotFoundError("Passkey not found");
      }

      assertRemovableFromAccountSettings({
        signInEnabled: credential.signInEnabled,
        vaultUnlockEnabled: credential.vaultUnlockEnabled,
      });

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
