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
