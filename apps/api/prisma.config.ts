import "dotenv/config";

import { defineConfig } from "prisma/config";

const defaultDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/japan_travel_planner_ai?schema=public";
const configuredDatabaseUrl = process.env.DATABASE_URL?.trim();

if (!configuredDatabaseUrl && process.env.NODE_ENV === "production") {
  throw new Error("Invalid DATABASE_URL: required when NODE_ENV=production.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx src/db/seed.ts"
  },
  datasource: {
    url: configuredDatabaseUrl || defaultDatabaseUrl
  }
});
