import { and, eq, gt, isNotNull, isNull, lt } from "drizzle-orm";
import type { DbClient } from "@/lib/db/types";
import { webauthnBrokerOperations } from "@/lib/db/schema";
import type { PortableVaultGrantAction } from "../lib/portable-vault-grant-types";

const RETENTION_MS = 24 * 60 * 60 * 1000;

export function createPasskeyGrantRepository(db: DbClient) {
  const repo = {
    async deleteExpiredOperations(client: DbClient = db) {
      await client
        .delete(webauthnBrokerOperations)
        .where(lt(webauthnBrokerOperations.createdAt, new Date(Date.now() - RETENTION_MS)));
    },

    async createOperation(
      data: {
        userId: string;
        accountSessionId: string;
        credentialDbId: string;
        action: PortableVaultGrantAction;
        challengeHash: string;
        ephemeralPublicKeyThumbprint: string | null;
        envelopeIdHash: string | null;
        challengeExpiresAt: Date;
      },
      client: DbClient = db
    ) {
      await repo.deleteExpiredOperations(client);
      const [row] = await client
        .insert(webauthnBrokerOperations)
        .values({
          userId: data.userId,
          accountSessionId: data.accountSessionId,
          credentialDbId: data.credentialDbId,
          purpose: "portable_vault",
          action: data.action,
          challengeHash: data.challengeHash,
          ephemeralPublicKeyThumbprint: data.ephemeralPublicKeyThumbprint,
          envelopeIdHash: data.envelopeIdHash,
          challengeExpiresAt: data.challengeExpiresAt,
        })
        .returning();
      return row;
    },

    async findPendingOperation(input: {
      requestId: string;
      userId: string;
      accountSessionId: string;
      challengeHash: string;
    }) {
      const [row] = await db
        .select()
        .from(webauthnBrokerOperations)
        .where(
          and(
            eq(webauthnBrokerOperations.requestId, input.requestId),
            eq(webauthnBrokerOperations.userId, input.userId),
            eq(webauthnBrokerOperations.accountSessionId, input.accountSessionId),
            eq(webauthnBrokerOperations.challengeHash, input.challengeHash),
            eq(webauthnBrokerOperations.purpose, "portable_vault"),
            isNull(webauthnBrokerOperations.challengeConsumedAt),
            isNull(webauthnBrokerOperations.grantJtiHash),
            gt(webauthnBrokerOperations.challengeExpiresAt, new Date())
          )
        )
        .limit(1);
      return row ?? null;
    },

    async consumeChallengeAndRecordGrant(
      input: {
        requestId: string;
        userId: string;
        accountSessionId: string;
        challengeHash: string;
        grantJtiHash: string;
        grantExpiresAt: Date;
      },
      client: DbClient = db
    ) {
      const now = new Date();
      const [row] = await client
        .update(webauthnBrokerOperations)
        .set({
          challengeConsumedAt: now,
          grantJtiHash: input.grantJtiHash,
          grantExpiresAt: input.grantExpiresAt,
        })
        .where(
          and(
            eq(webauthnBrokerOperations.requestId, input.requestId),
            eq(webauthnBrokerOperations.userId, input.userId),
            eq(webauthnBrokerOperations.accountSessionId, input.accountSessionId),
            eq(webauthnBrokerOperations.challengeHash, input.challengeHash),
            eq(webauthnBrokerOperations.purpose, "portable_vault"),
            isNull(webauthnBrokerOperations.challengeConsumedAt),
            isNull(webauthnBrokerOperations.grantJtiHash),
            gt(webauthnBrokerOperations.challengeExpiresAt, now)
          )
        )
        .returning();
      return row ?? null;
    },

    async findGrantedOperation(input: {
      requestId: string;
      userId: string;
      accountSessionId: string;
    }) {
      const [row] = await db
        .select()
        .from(webauthnBrokerOperations)
        .where(
          and(
            eq(webauthnBrokerOperations.requestId, input.requestId),
            eq(webauthnBrokerOperations.userId, input.userId),
            eq(webauthnBrokerOperations.accountSessionId, input.accountSessionId),
            eq(webauthnBrokerOperations.purpose, "portable_vault"),
            isNotNull(webauthnBrokerOperations.challengeConsumedAt),
            isNotNull(webauthnBrokerOperations.grantJtiHash),
            isNull(webauthnBrokerOperations.receiptJtiHash),
            isNull(webauthnBrokerOperations.completedAt)
          )
        )
        .limit(1);
      return row ?? null;
    },

    async completeWithReceipt(
      input: {
        requestId: string;
        userId: string;
        accountSessionId: string;
        grantJtiHash: string;
        receiptJtiHash: string;
      },
      client: DbClient = db
    ) {
      const [row] = await client
        .update(webauthnBrokerOperations)
        .set({ receiptJtiHash: input.receiptJtiHash, completedAt: new Date() })
        .where(
          and(
            eq(webauthnBrokerOperations.requestId, input.requestId),
            eq(webauthnBrokerOperations.userId, input.userId),
            eq(webauthnBrokerOperations.accountSessionId, input.accountSessionId),
            eq(webauthnBrokerOperations.grantJtiHash, input.grantJtiHash),
            isNull(webauthnBrokerOperations.receiptJtiHash),
            isNull(webauthnBrokerOperations.completedAt)
          )
        )
        .returning();
      return row ?? null;
    },
  };

  return repo;
}

export type PasskeyGrantRepository = ReturnType<typeof createPasskeyGrantRepository>;
