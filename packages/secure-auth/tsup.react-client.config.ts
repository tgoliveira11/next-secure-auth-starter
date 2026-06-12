import { defineConfig } from "tsup";

/** Client-only React helpers — must build before UI page DTS. */
export default defineConfig({
  format: ["esm"] as const,
  dts: true,
  sourcemap: true,
  splitting: false,
  target: "es2022" as const,
  entry: { "react/client": "src/react/client.ts" },
  outDir: "dist",
  clean: false,
  banner: { js: '"use client";' },
  external: [
    "react",
    "react-dom",
    "next-auth",
    "@simplewebauthn/browser",
    "@tgoliveira/secure-auth/client",
  ],
});
