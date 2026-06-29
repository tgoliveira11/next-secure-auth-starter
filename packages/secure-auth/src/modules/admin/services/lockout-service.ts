import type { SecureAuthConfig } from "@/core/types";
import type { LockoutRepository, LoginAttemptCounter } from "../repositories/lockout-repository";

const DEFAULT_THRESHOLDS: NonNullable<NonNullable<SecureAuthConfig["accountLockout"]>["thresholds"]> = [
  { attempts: 3, action: "freeze", freezeDurationSeconds: 300 },
  { attempts: 6, action: "freeze", freezeDurationSeconds: 1800 },
  { attempts: 9, action: "freeze", freezeDurationSeconds: 14400 },
  { attempts: 12, action: "lock" },
];

export type LockoutState =
  | { status: "ok" }
  | { status: "frozen"; retryAfterSeconds: number }
  | { status: "locked" };

type LockoutServiceDeps = {
  config: SecureAuthConfig;
  lockoutRepository: LockoutRepository;
};

function computeState(row: LoginAttemptCounter | null): LockoutState {
  if (!row) return { status: "ok" };
  if (row.lockedAt && !row.unlockedAt) return { status: "locked" };
  if (row.frozenUntil && row.frozenUntil > new Date()) {
    const retryAfterSeconds = Math.ceil((row.frozenUntil.getTime() - Date.now()) / 1000);
    return { status: "frozen", retryAfterSeconds };
  }
  return { status: "ok" };
}

export function createLockoutService({ config, lockoutRepository }: LockoutServiceDeps) {
  function isEnabled() {
    return config.accountLockout?.enabled === true;
  }

  function getThresholds() {
    return config.accountLockout?.thresholds ?? DEFAULT_THRESHOLDS;
  }

  async function getState(email: string): Promise<LockoutState> {
    if (!isEnabled()) return { status: "ok" };
    const row = await lockoutRepository.findByEmail(email);
    return computeState(row);
  }

  async function recordFailure(email: string, userId?: string): Promise<LockoutState> {
    if (!isEnabled()) return { status: "ok" };

    const existing = await lockoutRepository.findByEmail(email);
    const newAttempts = (existing?.attempts ?? 0) + 1;

    const thresholds = getThresholds().slice().sort((a, b) => b.attempts - a.attempts);
    const matched = thresholds.find((t) => newAttempts >= t.attempts);

    let patch: Parameters<LockoutRepository["upsertByEmail"]>[1] = {
      attempts: newAttempts,
      lastAttemptAt: new Date(),
    };

    if (userId) patch.userId = userId;

    if (matched) {
      if (matched.action === "lock") {
        patch = { ...patch, lockedAt: new Date(), frozenUntil: null };
      } else if (matched.action === "freeze" && matched.freezeDurationSeconds) {
        const frozenUntil = new Date(Date.now() + matched.freezeDurationSeconds * 1000);
        patch = { ...patch, frozenUntil };
      }
    }

    const row = await lockoutRepository.upsertByEmail(email, patch);
    return computeState(row);
  }

  async function recordSuccess(email: string, _userId?: string): Promise<void> {
    if (!isEnabled()) return;
    await lockoutRepository.resetByEmail(email);
  }

  async function unlockByUserId(userId: string, adminId: string): Promise<void> {
    await lockoutRepository.resetByUserId(userId, adminId);
  }

  async function listLockedAccounts(): Promise<LoginAttemptCounter[]> {
    return lockoutRepository.listLocked();
  }

  async function listFrozenAccounts(): Promise<LoginAttemptCounter[]> {
    return lockoutRepository.listFrozen();
  }

  return {
    isEnabled,
    getState,
    recordFailure,
    recordSuccess,
    unlockByUserId,
    listLockedAccounts,
    listFrozenAccounts,
  };
}

export type LockoutService = ReturnType<typeof createLockoutService>;

export class AccountFrozenError extends Error {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super(`Account temporarily frozen. Try again in ${retryAfterSeconds} seconds.`);
    this.name = "AccountFrozenError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class AccountLockedError extends Error {
  constructor() {
    super("Account has been locked due to too many failed login attempts.");
    this.name = "AccountLockedError";
  }
}
