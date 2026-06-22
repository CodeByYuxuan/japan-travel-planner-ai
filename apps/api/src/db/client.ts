import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";

export const defaultDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/japan_travel_planner_ai?schema=public";

type DatabaseEnv = {
  DATABASE_URL?: string | undefined;
};

export function loadDatabaseUrl(env: DatabaseEnv = process.env) {
  const databaseUrl = env.DATABASE_URL?.trim() || defaultDatabaseUrl;

  try {
    const parsedUrl = new URL(databaseUrl);

    if (
      parsedUrl.protocol !== "postgresql:" &&
      parsedUrl.protocol !== "postgres:"
    ) {
      throw new Error("Expected a PostgreSQL URL.");
    }
  } catch {
    throw new Error(
      "Invalid DATABASE_URL: expected a PostgreSQL connection URL."
    );
  }

  return databaseUrl;
}

export function createPrismaClient(databaseUrl = loadDatabaseUrl()) {
  const adapter = new PrismaPg({ connectionString: databaseUrl });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as typeof globalThis & {
  __japanTravelPlannerPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.__japanTravelPlannerPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__japanTravelPlannerPrisma = prisma;
}
