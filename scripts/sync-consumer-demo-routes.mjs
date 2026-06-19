#!/usr/bin/env node
/**
 * Syncs consumer-demo route files with the package route registry.
 * Run manually or via GitHub Action when create-routes.ts changes.
 *
 * Usage:
 *   node scripts/sync-consumer-demo-routes.mjs          # generate missing files
 *   node scripts/sync-consumer-demo-routes.mjs --check  # exit 1 if out of sync
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTE_REGISTRY } from "./consumer-demo-route-registry.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const API_DIR = join(REPO_ROOT, "apps/consumer-demo/src/app/api");
const CHECK_MODE = process.argv.includes("--check");

function generateNextAuthRoute() {
  return `import { secureAuth } from "@/lib/secure-auth";
import { createNextAuthRouteHandlers } from "@tgoliveira/secure-auth/next";
import NextAuth from "next-auth";

const handler = createNextAuthRouteHandlers(NextAuth, secureAuth.getServices);
export const { GET, POST } = handler;
`;
}

function generateRouteFile(entry) {
  if (entry.key === "nextAuth") return generateNextAuthRoute();

  const exports = entry.methods
    .map((m) => `export const ${m} = secureAuth.routes.${entry.key}.${m};`)
    .join("\n");

  return `import { secureAuth } from "@/lib/secure-auth";\n\n${exports}\n`;
}

function routeFilePath(entry) {
  return join(API_DIR, entry.path, "route.ts");
}

function isUpToDate(entry) {
  const filePath = routeFilePath(entry);
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, "utf-8");
  if (entry.key === "nextAuth") return content.includes("createNextAuthRouteHandlers");
  return entry.methods.every((m) => content.includes(`secureAuth.routes.${entry.key}.${m}`));
}

const missing = [];
const outdated = [];
const upToDate = [];

for (const entry of ROUTE_REGISTRY) {
  const filePath = routeFilePath(entry);
  if (!existsSync(filePath)) {
    missing.push(entry);
  } else if (!isUpToDate(entry)) {
    outdated.push(entry);
  } else {
    upToDate.push(entry);
  }
}

if (CHECK_MODE) {
  if (missing.length === 0 && outdated.length === 0) {
    console.log(`✓ consumer-demo is in sync (${upToDate.length} routes).`);
    process.exit(0);
  }
  if (missing.length > 0) {
    console.error("✗ Missing route files in consumer-demo:");
    missing.forEach((e) => console.error(`  ${e.key} → src/app/api/${e.path}/route.ts`));
  }
  if (outdated.length > 0) {
    console.error("✗ Outdated route files in consumer-demo:");
    outdated.forEach((e) => console.error(`  ${e.key} → src/app/api/${e.path}/route.ts`));
  }
  console.error("\nRun: node scripts/sync-consumer-demo-routes.mjs");
  process.exit(1);
}

const toGenerate = [...missing, ...outdated];

if (toGenerate.length === 0) {
  console.log(`✓ consumer-demo already in sync (${upToDate.length} routes). Nothing to do.`);
  process.exit(0);
}

for (const entry of toGenerate) {
  const filePath = routeFilePath(entry);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, generateRouteFile(entry));
  const label = missing.includes(entry) ? "created" : "updated";
  console.log(`  ${label}: src/app/api/${entry.path}/route.ts`);
}

console.log(`\n✓ Synced ${toGenerate.length} route(s). Review the changes before committing.`);
