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

const coverageConfig = {
  provider: "v8" as const,
  reporter: ["text", "text-summary", "lcov"],
  // Unit-test surface: route handlers, policies, lib, core — not full UI page trees or DB adapters.
  include: [
    "src/core/**/*.ts",
    "src/lib/**/*.ts",
    "src/server/**/*.ts",
    "src/next/**/*.ts",
    "src/drizzle/schema.ts",
    "src/modules/**/lib/**/*.ts",
    "src/modules/**/policies/**/*.ts",
    "src/modules/**/core/**/*.ts",
    "src/modules/**/templates/**/*.ts",
    "src/modules/ui/auth-redirect/**/*.ts",
    "src/modules/ui/config/**/*.ts",
    "src/modules/ui/context/**/*.ts",
    "src/modules/ui/hooks/**/*.ts",
  ],
  exclude: [
    "src/**/*.test.ts",
    "src/**/*.test.tsx",
    "src/test/**",
    "**/*.d.ts",
    "src/core/types.ts",
    "src/client/**",
    "src/email/**",
    "src/outpost/**",
    "src/lib/passkey/sign-in-with-passkey.ts",
    "src/lib/logout-account.ts",
    "src/lib/forms/read-named-form-field.ts",
    "src/modules/ui/auth-redirect/use-flow-page-guards.ts",
    "src/modules/ui/lib/brand-mark.ts",
    "src/modules/security/lib/api-key-auth.ts",
    "src/modules/auth/lib/login-request-context.ts",
    "src/modules/auth/lib/sign-out-client.ts",
    "src/modules/auth/lib/oauth-provider-profile.ts",
    "src/server/routes/create-routes.ts",
    "src/modules/passkeys/lib/messages.ts",
    "src/modules/passkeys/lib/prepare-webauthn-options.ts",
    "src/modules/sessions/lib/device-display-info.ts",
    "src/modules/sessions/lib/format-auth-method.ts",
    "src/modules/sessions/lib/format-auth-provider.ts",
    "src/modules/sessions/lib/format-session-datetime.ts",
    "src/modules/two-factor/lib/backup-code.ts",
    "src/modules/two-factor/lib/totp-login.ts",
    "src/next/**/middleware-entry.ts",
    "src/next/**/index.ts",
    "src/modules/database/lib/transaction.ts",
    "src/modules/**/services/**",
    "src/modules/**/repositories/**",
    "src/modules/ui/pages/**",
    "src/modules/ui/features/**",
    "src/modules/ui/primitives/**",
    "src/react/**",
    "src/modules/rate-limit/adapters/postgres-adapter.ts",
    "src/modules/sessions/lib/account-session-types.ts",
    "src/modules/ui/lib/main-content.ts",
    "src/next/**/login-trace.ts",
  ],
  thresholds: {
    statements: 90,
    lines: 90,
    functions: 90,
    branches: 90,
  },
};

export default defineConfig({
  plugins: [packageAliasPlugin()],
  test: {
    passWithNoTests: true,
    globals: true,
    coverage: coverageConfig,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          setupFiles: ["src/test/setup.ts"],
          include: ["src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "happy-dom",
          setupFiles: ["src/test/setup.ts"],
          include: ["src/**/*.test.tsx"],
        },
      },
    ],
  },
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "./src/test/mocks/server-only.ts"),
    },
  },
});
