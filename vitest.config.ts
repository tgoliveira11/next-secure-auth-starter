import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
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
        "src/modules/**/*.ts",
        "src/modules/**/*.tsx",
        "src/lib/api-client/**/*.ts",
        "src/lib/validation/**/*.ts",
        "src/lib/api-helpers.ts",
        "src/lib/db/transaction.ts",
        "src/features/passkey/**/*.ts",
        "src/app/api/**/*.ts",
      ],
      exclude: [
        "src/test/**",
        "src/types/**",
        "src/lib/db/schema.ts",
        "src/lib/db/index.ts",
        "src/modules/auth/lib/auth-options.ts",
        "src/modules/auth/lib/session.ts",
        "src/modules/**/repositories/**",
        "src/modules/**/index.ts",
        "src/modules/**/server.ts",
        "src/modules/rate-limit/adapters/postgres-adapter.ts",
        "src/app/api/auth/**/route.ts",
        "**/nextauth/**",
        "src/modules/sessions/lib/account-session-types.ts",
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
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
