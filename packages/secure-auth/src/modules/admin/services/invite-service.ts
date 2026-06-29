import { randomBytes } from "node:crypto";
import type { SecureAuthConfig } from "@/core/types";
import type { InviteRepository, InviteCode } from "../repositories/invite-repository";

type InviteServiceDeps = {
  config: SecureAuthConfig;
  inviteRepository: InviteRepository;
};

function generateCode(): string {
  return randomBytes(6).toString("base64url").toUpperCase().slice(0, 8);
}

export class InvalidInviteCodeError extends Error {
  constructor() { super("Invalid invite code"); this.name = "InvalidInviteCodeError"; }
}
export class ExpiredInviteCodeError extends Error {
  constructor() { super("Invite code has expired"); this.name = "ExpiredInviteCodeError"; }
}
export class ExhaustedInviteCodeError extends Error {
  constructor() { super("Invite code has reached its maximum uses"); this.name = "ExhaustedInviteCodeError"; }
}
export class EmailMismatchInviteCodeError extends Error {
  constructor() { super("Invite code is not valid for this email address"); this.name = "EmailMismatchInviteCodeError"; }
}
export class QuotaExceededError extends Error {
  constructor() { super("Invite code quota exceeded"); this.name = "QuotaExceededError"; }
}

export function createInviteService({ config, inviteRepository }: InviteServiceDeps) {
  function isEnabled() { return config.invites?.enabled === true; }
  function requiresApproval() { return config.invites?.requireApproval === true; }
  function requiresCode() { return config.invites?.requireInviteCode === true; }

  async function validateCode(code: string, email?: string): Promise<InviteCode> {
    const row = await inviteRepository.findByCode(code);
    if (!row || row.revokedAt) throw new InvalidInviteCodeError();
    if (row.expiresAt && row.expiresAt < new Date()) throw new ExpiredInviteCodeError();
    if (row.maxUses !== null && row.usedCount >= row.maxUses) throw new ExhaustedInviteCodeError();
    if (row.emailHint && email && row.emailHint.toLowerCase() !== email.toLowerCase()) {
      throw new EmailMismatchInviteCodeError();
    }
    return row;
  }

  async function consumeCode(codeId: string, newUserId: string): Promise<void> {
    await inviteRepository.incrementUsed(codeId, newUserId);
  }

  async function generateInviteCode(
    creatorId: string,
    options?: { maxUses?: number; emailHint?: string; isAdmin?: boolean }
  ): Promise<{ code: string; inviteCode: InviteCode }> {
    if (!options?.isAdmin) {
      const quota = config.invites?.defaultQuotaPerUser ?? 0;
      if (quota === 0) throw new QuotaExceededError();
      const existing = await inviteRepository.countActiveByUser(creatorId);
      if (existing >= quota) throw new QuotaExceededError();
    }

    const code = generateCode();
    const expiryDays = config.invites?.codeExpiryDays ?? 30;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const inviteCode = await inviteRepository.create({
      code,
      createdBy: creatorId,
      maxUses: options?.maxUses ?? 1,
      emailHint: options?.emailHint,
      expiresAt,
    });

    return { code, inviteCode };
  }

  async function revokeCode(codeId: string, adminId: string): Promise<void> {
    await inviteRepository.revoke(codeId, adminId);
  }

  async function listCodes(filter?: { createdBy?: string }): Promise<InviteCode[]> {
    return inviteRepository.listAll(filter);
  }

  return {
    isEnabled,
    requiresApproval,
    requiresCode,
    validateCode,
    consumeCode,
    generateCode: generateInviteCode,
    revokeCode,
    listCodes,
  };
}

export type InviteService = ReturnType<typeof createInviteService>;
