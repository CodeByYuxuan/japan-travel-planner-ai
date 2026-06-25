import { describe, expect, test, vi } from "vitest";

import type { PrismaClient } from "../generated/prisma/client.js";
import { createPrismaProviderResultRepository } from "./providerResultRepository.js";

function createFakeProviderResultClient() {
  type RecordValue = {
    id: string;
    provider: string;
    operation: string;
    cacheKey: string;
    requestHash: string;
    requestJson: unknown;
    responseJson: unknown;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  };

  const records = new Map<string, RecordValue>();
  let nextId = 1;

  const providerResult = {
    findFirst: vi.fn(async (query: { where: { cacheKey: string; expiresAt: { gt: Date } } }) => {
      const record = records.get(query.where.cacheKey);

      if (!record || record.expiresAt <= query.where.expiresAt.gt) {
        return null;
      }

      return structuredClone(record);
    }),
    upsert: vi.fn(
      async (query: {
        where: { cacheKey: string };
        create: Omit<RecordValue, "id" | "createdAt" | "updatedAt">;
        update: Omit<RecordValue, "id" | "cacheKey" | "createdAt" | "updatedAt">;
      }) => {
        const existingRecord = records.get(query.where.cacheKey);
        const timestamp = new Date("2026-06-25T00:00:00.000Z");
        const record =
          existingRecord === undefined
            ? {
                id: `provider-result-${nextId++}`,
                ...query.create,
                createdAt: timestamp,
                updatedAt: timestamp
              }
            : {
                ...existingRecord,
                ...query.update,
                updatedAt: timestamp
              };

        records.set(query.where.cacheKey, record);

        return structuredClone(record);
      }
    )
  };

  return {
    client: {
      providerResult
    } as unknown as PrismaClient,
    providerResult
  };
}

const freshExpiresAt = new Date("2026-06-25T04:00:00.000Z");
const expiredExpiresAt = new Date("2026-06-24T23:00:00.000Z");
const now = new Date("2026-06-25T00:00:00.000Z");

describe("provider result repository", () => {
  test("can store and retrieve a usable provider result", async () => {
    const { client } = createFakeProviderResultClient();
    const repository = createPrismaProviderResultRepository(client);

    await repository.upsert({
      provider: "openweather",
      operation: "weather.summary",
      cacheKey: "openweather:weather.summary:test-hash",
      requestHash: "test-hash",
      requestJson: {
        city: "tokyo",
        date: "2026-04-06"
      },
      responseJson: {
        status: "available"
      },
      expiresAt: freshExpiresAt
    });

    const result = await repository.findUsable(
      "openweather:weather.summary:test-hash",
      now
    );

    expect(result).toMatchObject({
      provider: "openweather",
      operation: "weather.summary",
      requestHash: "test-hash",
      responseJson: {
        status: "available"
      }
    });
  });

  test("does not treat expired provider results as usable", async () => {
    const { client } = createFakeProviderResultClient();
    const repository = createPrismaProviderResultRepository(client);

    await repository.upsert({
      provider: "openweather",
      operation: "weather.summary",
      cacheKey: "openweather:weather.summary:expired-hash",
      requestHash: "expired-hash",
      requestJson: {
        city: "tokyo"
      },
      responseJson: {
        status: "available"
      },
      expiresAt: expiredExpiresAt
    });

    await expect(
      repository.findUsable("openweather:weather.summary:expired-hash", now)
    ).resolves.toBeNull();
  });

  test("upsert refreshes cached response and expiration", async () => {
    const { client } = createFakeProviderResultClient();
    const repository = createPrismaProviderResultRepository(client);

    await repository.upsert({
      provider: "openweather",
      operation: "weather.summary",
      cacheKey: "openweather:weather.summary:refresh-hash",
      requestHash: "refresh-hash",
      requestJson: {
        city: "tokyo"
      },
      responseJson: {
        status: "missing"
      },
      expiresAt: expiredExpiresAt
    });
    await repository.upsert({
      provider: "openweather",
      operation: "weather.summary",
      cacheKey: "openweather:weather.summary:refresh-hash",
      requestHash: "refresh-hash",
      requestJson: {
        city: "tokyo"
      },
      responseJson: {
        status: "available"
      },
      expiresAt: freshExpiresAt
    });

    const result = await repository.findUsable(
      "openweather:weather.summary:refresh-hash",
      now
    );

    expect(result).toMatchObject({
      responseJson: {
        status: "available"
      },
      expiresAt: freshExpiresAt
    });
  });
});
