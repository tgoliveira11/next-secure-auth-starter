import path from "node:path";
import { defineConfig } from "tsup";

const shared = {
  esbuildOptions(options: { alias?: Record<string, string> }) {
    options.alias = {
      "@": path.resolve("src"),
    };
  },
  format: ["esm"] as const,
  dts: true,
  sourcemap: true,
  splitting: false,
  target: "es2022" as const,
  external: [
    "drizzle-orm",
    "drizzle-orm/pg-core",
    "drizzle-orm/postgres-js",
    "next",
    "react",
    "react-dom",
    "postgres",
    "bcryptjs",
    "@simplewebauthn/server",
    "server-only",
  ],
};

export default defineConfig([
  {
    ...shared,
    entry: { "react/client": "src/react/client.ts" },
    outDir: "dist",
    clean: true,
    banner: { js: '"use client";' },
  },
  {
    ...shared,
    entry: {
      index: "src/index.ts",
      "next/index": "src/next/index.ts",
      "react/index": "src/react/index.ts",
      "server/index": "src/server/index.ts",
      "drizzle/schema": "src/drizzle/schema.ts",
      "email/index": "src/email/index.ts",
      "client/index": "src/client/index.ts",
      "client/password-policy": "src/client/password-policy.ts",
    },
    outDir: "dist",
    clean: false,
  },
]);
