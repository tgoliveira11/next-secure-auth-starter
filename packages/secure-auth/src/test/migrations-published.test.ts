import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATIONS_DIR = join(import.meta.dirname, "../../migrations");
const META_DIR = join(MIGRATIONS_DIR, "meta");

const V03_ADMIN_TABLES = [
  "admin_config_overrides",
  "api_keys",
  "invite_codes",
  "invite_uses",
  "login_attempt_counters",
] as const;

const USER_PREFERENCES_TABLE = "user_preferences";

describe("published SQL migrations", () => {
  it("includes v0.3 admin platform migration in the journal", () => {
    const journal = JSON.parse(readFileSync(join(META_DIR, "_journal.json"), "utf-8")) as {
      entries: Array<{ tag: string }>;
    };

    expect(journal.entries.map((entry) => entry.tag)).toContain("0002_v0_3_admin_platform");
  });

  it("0002 migration creates admin platform tables without duplicating 0001", () => {
    const sql = readFileSync(join(MIGRATIONS_DIR, "0002_v0_3_admin_platform.sql"), "utf-8");

    for (const table of V03_ADMIN_TABLES) {
      expect(sql).toContain(`CREATE TABLE "${table}"`);
    }

    expect(sql).toContain('ALTER TABLE "users" ADD COLUMN "role"');
    expect(sql).not.toContain("vault_unlock_enabled");
  });

  it("0003 migration creates user_preferences with cascade delete", () => {
    const sql = readFileSync(join(MIGRATIONS_DIR, "0003_user_preferences.sql"), "utf-8");

    expect(sql).toContain(`CREATE TABLE "${USER_PREFERENCES_TABLE}"`);
    expect(sql).toContain("ON DELETE cascade");
    expect(sql).toContain("idx_user_preferences_user_namespace");
  });

  it("0004 migration adds the passkey assertion CAS revision with a safe backfill", () => {
    const sql = readFileSync(join(MIGRATIONS_DIR, "0004_outgoing_william_stryker.sql"), "utf-8");

    expect(sql).toContain('ALTER TABLE "passkey_credentials" ADD COLUMN "counter_revision"');
    expect(sql).toContain("DEFAULT 0 NOT NULL");
  });

  it("0005 migration adds session-bound, replay-protected portable vault operations", () => {
    const sql = readFileSync(
      join(MIGRATIONS_DIR, "0005_nasty_slipstream.sql"),
      "utf-8"
    );

    expect(sql).toContain('CREATE TABLE "webauthn_broker_operations"');
    expect(sql).toContain('"account_session_id" uuid NOT NULL');
    expect(sql).toContain('"challenge_hash" text NOT NULL');
    expect(sql).toContain('"grant_jti_hash" text');
    expect(sql).toContain('"receipt_jti_hash" text');
    expect(sql).toContain('"envelope_id_hash" text');
    expect(sql).toContain('CONSTRAINT "webauthn_broker_operations_purpose_check"');
    expect(sql).toContain('CONSTRAINT "webauthn_broker_operations_action_scope_check"');
    expect(sql).toContain("'portable_vault'");
    expect(sql).not.toContain("puk");
    expect(sql).not.toContain("private_key");
  });

  it("has a snapshot for every journal entry", () => {
    const journal = JSON.parse(readFileSync(join(META_DIR, "_journal.json"), "utf-8")) as {
      entries: Array<{ idx: number }>;
    };
    const snapshots = readdirSync(META_DIR).filter((name) => name.endsWith("_snapshot.json"));

    for (const entry of journal.entries) {
      const expected = `${String(entry.idx).padStart(4, "0")}_snapshot.json`;
      expect(snapshots, `missing meta/${expected}`).toContain(expected);
    }
  });
});
