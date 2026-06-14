import { defineConfig } from "drizzle-kit";
import { loadEnvFiles } from "./src/lib/load-env";

loadEnvFiles();

/** Package-owned schema and migrations — consumer only supplies DATABASE_URL. */
export default defineConfig({
  schema: "./src/lib/auth-schema.ts",
  out: "../../packages/secure-auth/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5433/consumer_demo_auth",
  },
});
