import { describe, expect, test, vi } from "vitest";

import type {
  ProviderResultRecord,
  ProviderResultRepository,
  ProviderResultWriteInput
} from "../../repositories/providerResultRepository.js";
import {
  createProviderResultCache,
  createProviderResultCacheIdentity,
  getOrSetProviderResult
} from "./cache.js";

class InMemoryProviderResultRepository implements ProviderResultRepository {
  private readonly records = new Map<string, ProviderResultRecord>();
  private nextId = 1;
  failRead = false;
  failWrite = false;

  async findUsable(cacheKey: string, now = new Date()) {
    if (this.failRead) {
      throw new Error("cache read failed");
    }

    const record = this.records.get(cacheKey);

    if (record === undefined || record.expiresAt <= now) {
      return null;
    }

    return structuredClone(record);
  }

  async upsert(input: ProviderResultWriteInput) {
    if (this.failWrite) {
      throw new Error("cache write failed");
    }

    const existingRecord = this.records.get(input.cacheKey);
    const timestamp = new Date("2026-06-25T00:00:00.000Z");
    const record: ProviderResultRecord = {
      id: existingRecord?.id ?? `provider-result-${this.nextId++}`,
      provider: input.provider,
      operation: input.operation,
      cacheKey: input.cacheKey,
      requestHash: input.requestHash,
      requestJson: structuredClone(input.requestJson),
      responseJson: structuredClone(input.responseJson),
      expiresAt: input.expiresAt,
      createdAt: existingRecord?.createdAt ?? timestamp,
      updatedAt: timestamp
    };

    this.records.set(input.cacheKey, record);

    return structuredClone(record);
  }

  async writeExpired(input: ProviderResultWriteInput) {
    return this.upsert(input);
  }
}

const now = new Date("2026-06-25T00:00:00.000Z");
const ttlMs = 60 * 60 * 1000;

describe("provider result cache keys", () => {
  test("creates stable cache keys for equivalent normalized inputs", () => {
    const firstIdentity = createProviderResultCacheIdentity({
      provider: "OpenWeather",
      operation: "weather.summary",
      input: {
        city: "  Tokyo   Station ",
        date: "2026-04-06",
        units: "metric"
      }
    });
    const secondIdentity = createProviderResultCacheIdentity({
      provider: "openweather",
      operation: "weather.summary",
      input: {
        units: "metric",
        date: "2026-04-06",
        city: "tokyo station"
      }
    });

    expect(firstIdentity).toEqual(secondIdentity);
  });

  test("changes cache keys when provider, query, date, or location changes", () => {
    const baseIdentity = createProviderResultCacheIdentity({
      provider: "openweather",
      operation: "weather.summary",
      input: {
        city: "Tokyo",
        date: "2026-04-06"
      }
    });
    const variants = [
      createProviderResultCacheIdentity({
        provider: "google-maps",
        operation: "weather.summary",
        input: {
          city: "Tokyo",
          date: "2026-04-06"
        }
      }),
      createProviderResultCacheIdentity({
        provider: "openweather",
        operation: "weather.summary",
        input: {
          city: "Kyoto",
          date: "2026-04-06"
        }
      }),
      createProviderResultCacheIdentity({
        provider: "openweather",
        operation: "weather.summary",
        input: {
          city: "Tokyo",
          date: "2026-04-07"
        }
      }),
      createProviderResultCacheIdentity({
        provider: "openweather",
        operation: "weather.summary",
        input: {
          date: "2026-04-06",
          latitude: 35.0116,
          longitude: 135.7681
        }
      })
    ];

    expect(new Set(variants.map((variant) => variant.cacheKey))).not.toContain(
      baseIdentity.cacheKey
    );
  });

  test("does not include API keys or secrets in cache identity", () => {
    const identity = createProviderResultCacheIdentity({
      provider: "openweather",
      operation: "weather.summary",
      input: {
        city: "Tokyo",
        apiKey: "super-secret-weather-key",
        headers: {
          authorization: "Bearer hidden-token"
        }
      }
    });

    expect(identity.cacheKey).not.toContain("super-secret-weather-key");
    expect(identity.cacheKey).not.toContain("hidden-token");
    expect(JSON.stringify(identity.normalizedInput)).not.toContain(
      "super-secret-weather-key"
    );
    expect(JSON.stringify(identity.normalizedInput)).not.toContain(
      "hidden-token"
    );
  });
});

describe("provider result cache", () => {
  test("uses cached provider response on repeated equivalent requests", async () => {
    const repository = new InMemoryProviderResultRepository();
    const cache = createProviderResultCache(repository);
    const load = vi.fn(async () => ({
      status: "available",
      weatherSummary: {
        city: "Tokyo"
      }
    }));
    const options = {
      provider: "openweather",
      operation: "weather.summary",
      input: {
        city: "Tokyo",
        date: "2026-04-06"
      },
      ttlMs,
      load,
      now
    };

    const firstResult = await cache.getOrSet(options);
    const secondResult = await cache.getOrSet(options);

    expect(firstResult.source).toBe("provider");
    expect(secondResult.source).toBe("cache");
    expect(secondResult.value).toEqual(firstResult.value);
    expect(load).toHaveBeenCalledTimes(1);
  });

  test("refreshes expired cache entries", async () => {
    const repository = new InMemoryProviderResultRepository();
    const identity = createProviderResultCacheIdentity({
      provider: "openweather",
      operation: "weather.summary",
      input: {
        city: "Tokyo",
        date: "2026-04-06"
      }
    });
    await repository.writeExpired({
      provider: "openweather",
      operation: "weather.summary",
      cacheKey: identity.cacheKey,
      requestHash: identity.requestHash,
      requestJson: identity.normalizedInput,
      responseJson: {
        status: "missing",
        weatherSummary: null
      },
      expiresAt: new Date(now.getTime() - 1000)
    });

    const load = vi.fn(async () => ({
      status: "available",
      weatherSummary: {
        city: "Tokyo"
      }
    }));
    const result = await getOrSetProviderResult(repository, {
      provider: "openweather",
      operation: "weather.summary",
      input: {
        city: "Tokyo",
        date: "2026-04-06"
      },
      ttlMs,
      load,
      now
    });

    expect(result.source).toBe("provider");
    expect(result.value).toEqual({
      status: "available",
      weatherSummary: {
        city: "Tokyo"
      }
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  test("continues when cache reads fail", async () => {
    const repository = new InMemoryProviderResultRepository();
    repository.failRead = true;
    const load = vi.fn(async () => "fresh-provider-value");

    const result = await getOrSetProviderResult(repository, {
      provider: "google-maps",
      operation: "maps.link",
      input: {
        title: "Senso-ji",
        location: {
          city: "Tokyo"
        }
      },
      ttlMs,
      load,
      now
    });

    expect(result).toMatchObject({
      source: "provider",
      value: "fresh-provider-value"
    });
  });

  test("continues when cache writes fail", async () => {
    const repository = new InMemoryProviderResultRepository();
    repository.failWrite = true;
    const load = vi.fn(async () => "fresh-provider-value");

    const result = await getOrSetProviderResult(repository, {
      provider: "google-maps",
      operation: "maps.link",
      input: {
        title: "Senso-ji",
        location: {
          city: "Tokyo"
        }
      },
      ttlMs,
      load,
      now
    });

    expect(result).toMatchObject({
      source: "provider",
      value: "fresh-provider-value"
    });
    expect(load).toHaveBeenCalledTimes(1);
  });
});
