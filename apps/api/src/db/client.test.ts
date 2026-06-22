import { describe, expect, test } from "vitest";

import {
  createPrismaClient,
  defaultDatabaseUrl,
  loadDatabaseUrl
} from "./client.js";

describe("database client setup", () => {
  test("uses a local PostgreSQL URL by default", () => {
    expect(loadDatabaseUrl({})).toBe(defaultDatabaseUrl);
  });

  test("accepts an explicit PostgreSQL URL", () => {
    const databaseUrl =
      "postgresql://planner:secret@localhost:5432/planner_test?schema=public";

    expect(loadDatabaseUrl({ DATABASE_URL: databaseUrl })).toBe(databaseUrl);
  });

  test("fails clearly for invalid database URLs", () => {
    expect(() =>
      loadDatabaseUrl({ DATABASE_URL: "sqlite://local.db" })
    ).toThrow("Invalid DATABASE_URL");
  });

  test("creates a Prisma client without connecting to the database", async () => {
    const client = createPrismaClient(defaultDatabaseUrl);

    expect(client).toHaveProperty("$connect");

    await client.$disconnect();
  });
});
