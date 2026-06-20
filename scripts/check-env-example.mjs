#!/usr/bin/env node
/**
 * Verifies that every primary env var read by buildSecureAuthConfigFromEnv
 * is documented in apps/consumer-demo/.env.example.
 *
 * Usage:
 *   node scripts/check-env-example.mjs          # print report
 *   node scripts/check-env-example.mjs --check  # exit 1 if any key is missing
 *
 * "Primary" means the first key in the array passed to readBooleanEnv / readEnv /
 * readEnumEnv / readNumberEnv / readFirstEnv / readOAuthPair. Aliases (later
 * entries in the same array) are not required to appear in .env.example.
 *
 * This script reads the source file as text — no TypeScript compilation needed.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

const ENV_BUILDER_PATH = join(
  REPO_ROOT,
  "apps/consumer-demo/src/lib/env/secure-auth-from-env.ts"
);
const ENV_EXAMPLE_PATH = join(REPO_ROOT, "apps/consumer-demo/.env.example");
const CHECK_MODE = process.argv.includes("--check");

// ---------------------------------------------------------------------------
// Parse primary env var keys from the source file
// ---------------------------------------------------------------------------

function extractPrimaryKeys(source) {
  const keys = new Set();

  // readBooleanEnv(env, ["KEY", ...], default)
  // readNumberEnv(env, ["KEY", ...], default, opts)
  // readEnumEnv<T>(env, ["KEY", ...], values, default)
  const arrayCallRe =
    /read(?:Boolean|Number|Enum)Env\s*(?:<[^>]*>)?\s*\(\s*\w+\s*,\s*\[([^\]]+)\]/g;

  for (const match of source.matchAll(arrayCallRe)) {
    const firstKey = match[1]
      .split(",")[0]
      .trim()
      .replace(/['"]/g, "");
    if (firstKey) keys.add(firstKey);
  }

  // readEnv(env, "KEY")
  const singleCallRe = /readEnv\s*\(\s*\w+\s*,\s*["']([A-Z][A-Z0-9_]*)["']\s*\)/g;
  for (const match of source.matchAll(singleCallRe)) {
    keys.add(match[1]);
  }

  // readFirstEnv(env, ["KEY", ...])  — first key is primary
  const firstEnvRe = /readFirstEnv\s*\(\s*\w+\s*,\s*\[([^\]]+)\]/g;
  for (const match of source.matchAll(firstEnvRe)) {
    const firstKey = match[1]
      .split(",")[0]
      .trim()
      .replace(/['"]/g, "");
    if (firstKey) keys.add(firstKey);
  }

  // readOAuthPair(env, ["ID_KEY", ...], ["SECRET_KEY", ...])  — both first keys are primary
  const oauthPairRe =
    /readOAuthPair\s*\(\s*\w+\s*,\s*\[([^\]]+)\]\s*,\s*\[([^\]]+)\]/g;
  for (const match of source.matchAll(oauthPairRe)) {
    const idKey = match[1].split(",")[0].trim().replace(/['"]/g, "");
    const secretKey = match[2].split(",")[0].trim().replace(/['"]/g, "");
    if (idKey) keys.add(idKey);
    if (secretKey) keys.add(secretKey);
  }

  return keys;
}

// ---------------------------------------------------------------------------
// Parse keys present in .env.example
// ---------------------------------------------------------------------------

function extractExampleKeys(content) {
  const keys = new Set();
  // Match uncommented variable definitions: KEY=... or # KEY= (documented but disabled)
  // We accept both active lines and commented-out lines so that opt-in flags
  // documented with a leading # are still counted.
  const re = /^#?\s*([A-Z][A-Z0-9_]*)=/gm;
  for (const match of content.matchAll(re)) {
    keys.add(match[1]);
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const source = readFileSync(ENV_BUILDER_PATH, "utf-8");
const example = readFileSync(ENV_EXAMPLE_PATH, "utf-8");

const required = extractPrimaryKeys(source);
const documented = extractExampleKeys(example);

// Keys that are in the source but not in .env.example
const missing = [...required].filter((k) => !documented.has(k)).sort();

// Keys in .env.example but not in the source (informational only — not an error)
const extra = [...documented].filter((k) => !required.has(k)).sort();

if (missing.length === 0) {
  console.log(
    `✓ .env.example covers all ${required.size} primary env vars from buildSecureAuthConfigFromEnv.`
  );
  if (extra.length > 0) {
    console.log(
      `  ${extra.length} extra key(s) in .env.example (app-level, not from the package): ${extra.join(", ")}`
    );
  }
  process.exit(0);
}

console.error(
  `✗ ${missing.length} primary env var(s) from buildSecureAuthConfigFromEnv are missing from .env.example:\n`
);
for (const key of missing) {
  console.error(`  ${key}`);
}
console.error(
  "\nAdd the missing variables to apps/consumer-demo/.env.example and re-run."
);

if (CHECK_MODE) {
  process.exit(1);
}
