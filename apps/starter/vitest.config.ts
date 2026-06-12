import { defineConfig } from "vitest/config";
import path from "path";
import type { Plugin } from "vite";

const packageSrc = path.resolve(__dirname, "../../packages/secure-auth/src");
const starterSrc = path.resolve(__dirname, "./src");

/** Resolve `@/` to starter or package src (package fallback for package-only modules). */
function packageAwareAliasPlugin(): Plugin {
  return {
    name: "package-aware-alias",
    async resolveId(source, importer, options) {
      if (!source.startsWith("@/")) return null;
      const subpath = source.slice(2);
      const isPackageImporter =
        importer != null &&
        (importer.includes(`${path.sep}packages${path.sep}secure-auth${path.sep}`) ||
          importer.includes("packages/secure-auth/"));
      if (isPackageImporter) {
        const candidate = path.join(packageSrc, subpath);
        return (await this.resolve(candidate, importer, { ...options, skipSelf: true })) ?? candidate;
      }
      const starterCandidate = path.join(starterSrc, subpath);
      const starterResolved = await this.resolve(starterCandidate, importer, {
        ...options,
        skipSelf: true,
      });
      if (starterResolved) return starterResolved;
      const packageCandidate = path.join(packageSrc, subpath);
      return (await this.resolve(packageCandidate, importer, { ...options, skipSelf: true })) ?? packageCandidate;
    },
  };
}

export default defineConfig({
  plugins: [packageAwareAliasPlugin()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      include: [
        "src/modules/email/**/*.ts",
        "src/lib/**/*.ts",
        "src/features/passkey/**/*.ts",
        "src/app/api/**/*.ts",
        "src/components/**/*.tsx",
      ],
      exclude: [
        "src/test/**",
        "src/types/**",
        "src/lib/db/schema.ts",
        "src/lib/db/index.ts",
        "src/app/api/auth/**/route.ts",
        "**/nextauth/**",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "./src/test/mocks/server-only.ts"),
    },
  },
});
