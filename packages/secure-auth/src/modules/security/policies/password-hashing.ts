import bcrypt from "bcryptjs";
import { hash as hashArgon2, verify as verifyArgon2 } from "@node-rs/argon2";

/** Legacy bcrypt cost retained only for verifying hashes written before secure-auth 0.13.0. */
export const BCRYPT_COST = 12;

/** OWASP Password Storage Cheat Sheet minimum for Argon2id. */
export const ARGON2ID_PARAMETERS = Object.freeze({
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
  // @node-rs/argon2 declares ambient const enums, which isolatedModules cannot access by name.
  algorithm: 2 as const, // Algorithm.Argon2id
  version: 1 as const, // Version.V0x13 (Argon2 version 19)
});

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const ARGON2ID_HASH_PATTERN =
  /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$[A-Za-z0-9+/]+={0,2}\$([A-Za-z0-9+/]+={0,2})$/;

export type PasswordHashAlgorithm = "argon2id" | "bcrypt";

export function identifyPasswordHashAlgorithm(passwordHash: string): PasswordHashAlgorithm | null {
  if (ARGON2ID_HASH_PATTERN.test(passwordHash)) return "argon2id";
  if (BCRYPT_HASH_PATTERN.test(passwordHash)) return "bcrypt";
  return null;
}

export function assertPasswordHashFormat(passwordHash: string): void {
  if (!identifyPasswordHashAlgorithm(passwordHash)) {
    throw new Error("password_hash must be an Argon2id or legacy bcrypt digest, never plaintext");
  }
}

export async function hashPassword(plaintext: string): Promise<string> {
  const passwordHash = await hashArgon2(plaintext, ARGON2ID_PARAMETERS);
  assertPasswordHashFormat(passwordHash);
  return passwordHash;
}

export async function verifyPassword(plaintext: string, passwordHash: string): Promise<boolean> {
  assertPasswordHashFormat(passwordHash);
  return identifyPasswordHashAlgorithm(passwordHash) === "argon2id"
    ? verifyArgon2(passwordHash, plaintext)
    : bcrypt.compare(plaintext, passwordHash);
}

export function passwordHashNeedsRehash(passwordHash: string): boolean {
  assertPasswordHashFormat(passwordHash);
  if (identifyPasswordHashAlgorithm(passwordHash) === "bcrypt") return true;

  const match = ARGON2ID_HASH_PATTERN.exec(passwordHash)!;

  return (
    Number(match[1]) !== ARGON2ID_PARAMETERS.memoryCost ||
    Number(match[2]) !== ARGON2ID_PARAMETERS.timeCost ||
    Number(match[3]) !== ARGON2ID_PARAMETERS.parallelism ||
    Buffer.from(match[4], "base64").length !== ARGON2ID_PARAMETERS.outputLen
  );
}
