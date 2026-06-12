import path from "node:path";
import { defineConfig } from "tsup";

const shared = {
  esbuildOptions(options: { alias?: Record<string, string>; sourcesContent?: boolean }) {
    options.alias = {
      "@": path.resolve("src"),
    };
    options.sourcesContent = false;
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
    "next-auth",
    "react",
    "react-dom",
    "postgres",
    "bcryptjs",
    "@simplewebauthn/server",
    "server-only",
  ],
};

/** Core/server/client entries — must build first so UI DTS can resolve package subpaths. */
export default defineConfig({
  ...shared,
  entry: {
    index: "src/index.ts",
    "next/index": "src/next/index.ts",
    "drizzle/schema": "src/drizzle/schema.ts",
    "email/index": "src/email/index.ts",
    "client/index": "src/client/index.ts",
    "client/password-policy": "src/client/password-policy.ts",
  },
  outDir: "dist",
  clean: true,
});
