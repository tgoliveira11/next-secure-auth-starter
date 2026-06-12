import path from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const packageSrc = path.resolve(__dirname, "./src");

function packageAliasPlugin(): Plugin {
  return {
    name: "package-alias",
    async resolveId(source, importer, options) {
      if (!source.startsWith("@/")) return null;
      const candidate = path.join(packageSrc, source.slice(2));
      return (await this.resolve(candidate, importer, { ...options, skipSelf: true })) ?? candidate;
    },
  };
}

export default defineConfig({
  plugins: [packageAliasPlugin()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: true,
    setupFiles: ["src/test/setup.ts"],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "./src/test/mocks/server-only.ts"),
    },
  },
});
