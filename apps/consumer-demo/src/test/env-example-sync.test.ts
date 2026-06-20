import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, "../../../../scripts/check-env-example.mjs");

describe("consumer-demo env example sync", () => {
  it(
    "every primary env var in buildSecureAuthConfigFromEnv is documented in .env.example (run node scripts/check-env-example.mjs to diagnose)",
    () => {
      const result = spawnSync("node", [SCRIPT, "--check"], { encoding: "utf-8" });
      expect(result.status, result.stderr || result.stdout).toBe(0);
    }
  );
});
