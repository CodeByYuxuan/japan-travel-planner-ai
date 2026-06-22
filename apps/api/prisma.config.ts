import "dotenv/config";

import { defineConfig } from "prisma/config";

const defaultDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/japan_travel_planner_ai?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx src/db/seed.ts"
  },
  datasource: {
    url: process.env.DATABASE_URL?.trim() || defaultDatabaseUrl
  }
});
