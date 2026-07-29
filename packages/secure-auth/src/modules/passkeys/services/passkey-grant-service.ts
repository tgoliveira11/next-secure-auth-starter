import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import type { SecureAuthContext } from "@/core/create-secure-auth-context";
import type { SecureAuthRepositories } from "@/core/create-repositories";
import type { RateLimitApi } from "@/modules/rate-limit";
import type { RunInTransaction } from "@/lib/db/transaction";
import { resolvePasskeyCounterAdvance } from "@/modules/passkeys/lib/passkey-counter";
import { ChallengeError, NotFoundError } from "./passkey-service";
import {
  createPortableVaultGrantJti,
  derivePortableVaultOpaqueSubjectId,
  hashPortableVaultOperationValue,
  normalizeAndThumbprintEphemeralPublicKey,
  requirePortableVaultGrantsConfig,
  signPortableVaultGrant,
  verifyPortableVaultBrokerReceipt,
  PortableVaultGrantValidationError,
} from "../lib/portable-vault-grant-crypto";
import {
  PORTABLE_VAULT_GRANT_PURPOSE,
  PORTABLE_VAULT_GRANT_VERSION,
  type PortableVaultBrokerReceiptClaimsV1,
  type PortableVaultEphemeralPublicKeyJwk,
  type PortableVaultGrantAction,
  type PortableVaultGrantClaimsV1,
  type PortableVaultGrantOptionsRequest,
  type PortableVaultGrantVerifyRequest,
} from "../lib/portable-vault-grant-types";

const CHALLENGE_TTL_MS = 2 * 60 * 1000;
const RECEIPT_OPERATION_CLOCK_SKEW_MS = 30 * 1000;

type PasskeyGrantServiceDeps = {
  ctx: SecureAuthContext;
  repos: SecureAuthRepositories;
  rateLimit: RateLimitApi;
  runInTransaction: RunInTransaction;
};

type SessionBinding = {
  userId: string;
  accountSessionId: string;
};

function conflict(message: string): never {
  const error = new Error(message);
  error.name = "ConflictError";
  throw error;
}

function assertCredentialMayPerform(
  credential: { signInEnabled: boolean; vaultUnlockEnabled: boolean },
  action: PortableVaultGrantAction
): void {
  if (action === "enroll") {
    if (!credential.signInEnabled && !credential.vaultUnlockEnabled) {
      conflict("This passkey is not eligible for portable vault enrollment");
    }
    return;
  }
  if (!credential.vaultUnlockEnabled) {
    conflict("This passkey is not enabled for portable vault access");
  }
}

function parseClientChallenge(response: AuthenticationResponseJSON): string {
  try {
    const clientData = JSON.parse(
      Buffer.from(response.response.clientDataJSON, "base64url").toString()
    ) as { challenge?: unknown };
    if (typeof clientData.challenge === "string" && clientData.challenge.length > 0) {
      return clientData.challenge;
    }
  } catch {
    // Normalized below.
  }
  throw new ChallengeError("Invalid or expired portable vault challenge");
}

export function createPasskeyGrantService(deps: PasskeyGrantServiceDeps) {
  const { ctx, repos, rateLimit, runInTransaction } = deps;
  const rpID = ctx.getWebAuthnRpId();
  const origins = ctx.getWebAuthnOrigins();

  return {
    async getOptions(
      session: SessionBinding,
      input: PortableVaultGrantOptionsRequest,
      ip?: string
    ) {
      requirePortableVaultGrantsConfig(ctx.config);
      await rateLimit.enforceRateLimit({
        operation: "passkey.portable_vault_grant",
        userId: session.userId,
        ip,
        endpoint: "/api/account/passkeys/portable-vault-grants/options",
      });

      const credential = await repos.passkeyRepository.findByIdForUser(
        input.credentialDbId,
        session.userId
      );
      if (!credential) throw new NotFoundError("Passkey not found");
      assertCredentialMayPerform(credential, input.action);

      const thumbprint =
        input.action === "unlock"
          ? normalizeAndThumbprintEphemeralPublicKey(input.ephemeralPublicKeyJwk).thumbprint
          : null;
      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: [
          {
            id: credential.credentialId,
            transports: (credential.transports as AuthenticatorTransport[]) ?? undefined,
          },
        ],
        userVerification: "required",
      });
      const operation = await repos.passkeyGrantRepository.createOperation({
        userId: session.userId,
        accountSessionId: session.accountSessionId,
        credentialDbId: credential.id,
        action: input.action,
        challengeHash: hashPortableVaultOperationValue(options.challenge),
        ephemeralPublicKeyThumbprint: thumbprint,
        envelopeIdHash:
          input.action === "enroll"
            ? null
            : hashPortableVaultOperationValue(input.envelopeId),
        challengeExpiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      });

      return { requestId: operation.requestId, options };
    },

    async verifyAndIssueGrant(
      session: SessionBinding,
      input: PortableVaultGrantVerifyRequest & { response: AuthenticationResponseJSON },
      ip?: string
    ) {
      const config = requirePortableVaultGrantsConfig(ctx.config);
      await rateLimit.enforceRateLimit({
        operation: "passkey.portable_vault_grant",
        userId: session.userId,
        ip,
        endpoint: "/api/account/passkeys/portable-vault-grants/verify",
      });

      const challenge = parseClientChallenge(input.response);
      const challengeHash = hashPortableVaultOperationValue(challenge);
      const operation = await repos.passkeyGrantRepository.findPendingOperation({
        requestId: input.requestId,
        userId: session.userId,
        accountSessionId: session.accountSessionId,
        challengeHash,
      });
      const envelopeIdHash =
        input.action === "enroll"
          ? null
          : hashPortableVaultOperationValue(input.envelopeId);
      if (
        !operation ||
        operation.action !== input.action ||
        operation.envelopeIdHash !== envelopeIdHash ||
        (input.action === "unlock" && !operation.ephemeralPublicKeyThumbprint)
      ) {
        throw new ChallengeError("Invalid or expired portable vault challenge");
      }

      const credential = await repos.passkeyRepository.findByIdForUser(
        operation.credentialDbId,
        session.userId
      );
      if (!credential) throw new NotFoundError("Passkey not found");
      assertCredentialMayPerform(credential, input.action);
      if (input.response.id !== credential.credentialId) {
        throw new ChallengeError("Portable vault passkey verification failed");
      }

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: input.response,
          expectedChallenge: challenge,
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
        throw new ChallengeError("Portable vault passkey verification failed");
      }

      const counterPlan = resolvePasskeyCounterAdvance(
        credential.counter,
        verification.authenticationInfo.newCounter
      );
      if (counterPlan.status === "invalid") {
        throw new ChallengeError("Portable vault passkey verification failed");
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiresAtSeconds = nowSeconds + (config.ttlSeconds ?? 60);
      const jti = createPortableVaultGrantJti();
      const baseClaims = {
        version: PORTABLE_VAULT_GRANT_VERSION,
        iss: config.issuer,
        aud: config.audience,
        sub: derivePortableVaultOpaqueSubjectId(config, session.userId),
        jti,
        iat: nowSeconds,
        exp: expiresAtSeconds,
        app_id: config.appId,
        purpose: PORTABLE_VAULT_GRANT_PURPOSE,
        credential_id: credential.credentialId,
        uv: true as const,
        auth_time: nowSeconds,
        request_id: operation.requestId,
      };
      const claims: PortableVaultGrantClaimsV1 =
        input.action === "unlock"
          ? {
              ...baseClaims,
              action: "unlock",
              envelope_id: input.envelopeId,
              epk_thumbprint: operation.ephemeralPublicKeyThumbprint!,
            }
          : input.action === "revoke"
            ? { ...baseClaims, action: "revoke", envelope_id: input.envelopeId }
            : { ...baseClaims, action: "enroll" };
      const grant = await signPortableVaultGrant(config, claims);

      await runInTransaction(async (tx) => {
        const consumed = await repos.passkeyGrantRepository.consumeChallengeAndRecordGrant(
          {
            requestId: operation.requestId,
            userId: session.userId,
            accountSessionId: session.accountSessionId,
            challengeHash,
            grantJtiHash: hashPortableVaultOperationValue(jti),
            grantExpiresAt: new Date(expiresAtSeconds * 1000),
          },
          tx
        );
        if (!consumed) {
          throw new ChallengeError("Invalid or expired portable vault challenge");
        }
        const advanced = await repos.passkeyRepository.advanceCounter(
          credential.credentialId,
          counterPlan.expectedCounter,
          counterPlan.nextCounter,
          credential.counterRevision,
          tx
        );
        if (advanced === "conflict") {
          throw new ChallengeError("Portable vault passkey verification failed");
        }
        await repos.passkeyRepository.updateLastUsedAt(credential.credentialId, tx);
        await repos.auditRepository.record(
          "portable_vault_grant_issued",
          session.userId,
          {
            endpoint: "/api/account/passkeys/portable-vault-grants/verify",
            credentialId: credential.id,
            action: input.action,
            requestId: operation.requestId,
          },
          tx
        );
      });

      return {
        requestId: operation.requestId,
        verifiedCredentialId: credential.credentialId,
        grant,
        expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
      };
    },

    async finalizeReceipt(
      session: SessionBinding,
      receipt: string,
      ip?: string
    ) {
      const config = requirePortableVaultGrantsConfig(ctx.config);
      await rateLimit.enforceRateLimit({
        operation: "passkey.portable_vault_receipt",
        userId: session.userId,
        ip,
        endpoint: "/api/account/passkeys/portable-vault-grants/finalize",
      });

      let claims: PortableVaultBrokerReceiptClaimsV1;
      try {
        claims = await verifyPortableVaultBrokerReceipt(config, receipt);
      } catch {
        throw new PortableVaultGrantValidationError("Invalid broker completion receipt");
      }
      const operation = await repos.passkeyGrantRepository.findGrantedOperation({
        requestId: claims.request_id,
        userId: session.userId,
        accountSessionId: session.accountSessionId,
      });
      if (!operation) {
        throw new PortableVaultGrantValidationError("Invalid broker completion receipt");
      }

      const credential = await repos.passkeyRepository.findByIdForUser(
        operation.credentialDbId,
        session.userId
      );
      const expectedSubject = derivePortableVaultOpaqueSubjectId(config, session.userId);
      if (
        !credential ||
        claims.purpose !== "portable_vault_completion" ||
        claims.action !== operation.action ||
        claims.sub !== expectedSubject ||
        claims.credential_id !== credential.credentialId ||
        (operation.action !== "enroll" &&
          hashPortableVaultOperationValue(claims.envelope_id) !== operation.envelopeIdHash) ||
        hashPortableVaultOperationValue(claims.grant_jti) !== operation.grantJtiHash ||
        !operation.challengeConsumedAt ||
        claims.iat * 1000 + RECEIPT_OPERATION_CLOCK_SKEW_MS <
          operation.challengeConsumedAt.getTime()
      ) {
        throw new PortableVaultGrantValidationError("Invalid broker completion receipt");
      }

      const vaultUnlockEnabled = claims.action === "enroll";
      await runInTransaction(async (tx) => {
        const completed = await repos.passkeyGrantRepository.completeWithReceipt(
          {
            requestId: operation.requestId,
            userId: session.userId,
            accountSessionId: session.accountSessionId,
            grantJtiHash: hashPortableVaultOperationValue(claims.grant_jti),
            receiptJtiHash: hashPortableVaultOperationValue(claims.jti),
          },
          tx
        );
        if (!completed) conflict("Portable vault completion receipt was already consumed");

        if (claims.action !== "unlock") {
          const updated = await repos.passkeyRepository.updateCredentialFlags(
            credential.id,
            session.userId,
            { vaultUnlockEnabled },
            tx
          );
          if (!updated) conflict("Portable vault credential state changed");
          if (!vaultUnlockEnabled && !updated.signInEnabled) {
            await repos.passkeyRepository.revoke(updated.id, session.userId, tx);
          }
        }
        await repos.auditRepository.record(
          "portable_vault_receipt_completed",
          session.userId,
          {
            endpoint: "/api/account/passkeys/portable-vault-grants/finalize",
            credentialId: credential.id,
            action: claims.action,
            requestId: operation.requestId,
          },
          tx
        );
      });

      const baseResult = {
        requestId: operation.requestId,
        credentialId: credential.credentialId,
        envelopeId: claims.envelope_id,
        action: claims.action,
        completed: true as const,
      };
      return claims.action === "unlock"
        ? baseResult
        : { ...baseResult, vaultUnlockEnabled };
    },
  };
}

export type PasskeyGrantService = ReturnType<typeof createPasskeyGrantService>;
