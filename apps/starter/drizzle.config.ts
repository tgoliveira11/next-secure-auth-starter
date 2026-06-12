import { defineConfig } from "drizzle-kit";
import { loadEnvFiles } from "./src/lib/load-env";

loadEnvFiles();

export default defineConfig({
  schema: "../../packages/secure-auth/src/drizzle/schema.ts",
  out: "../../packages/secure-auth/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5433/next_secure_auth_starter",
  },
});
