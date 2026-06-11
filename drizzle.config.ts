import { defineConfig } from "drizzle-kit";
import { loadEnvFiles } from "./src/modules/security/env/load-env";

loadEnvFiles();

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/next_secure_auth_starter",
  },
});
