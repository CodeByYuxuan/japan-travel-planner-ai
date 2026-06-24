import { describe, expect, test, vi } from "vitest";

import {
  WeatherProviderConfigurationError,
  WeatherProviderError,
  type WeatherProvider,
  type WeatherSummary
} from "../../providers/weather/weatherProvider.js";
import type {
  ProviderResultRecord,
  ProviderResultRepository,
  ProviderResultWriteInput
} from "../../repositories/providerResultRepository.js";
import {
  createProviderResultCache,
  createProviderResultCacheIdentity
} from "./cache.js";
import {
  createCachedWeatherSummary,
  createWeatherSummary,
  normalizeWeatherSummaryCacheInput
} from "./weatherEnrichment.js";

const weatherSummary = {
  city: "Tokyo",
  cloudCoverPercent: 45,
  condition: "Partly cloudy",
  coordinates: {
    latitude: 35.6762,
    longitude: 139.6503
  },
  date: "2026-04-06",
  humidityPercent: 61,
  note: "Partly cloudy, 12-20 C, low precipitation expected",
  precipitationProbabilityPercent: null,
  precipitationTotalMillimeters: 0,
  temperatureMax: 20,
  temperatureMin: 12,
  temperatureUnit: "celsius",
  windSpeed: 5,
  windSpeedUnit: "meters_per_second"
} satisfies WeatherSummary;

const request = {
  city: "Tokyo",
  date: "2026-04-06"
};

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

    const timestamp = new Date("2026-06-25T00:00:00.000Z");
    const existingRecord = this.records.get(input.cacheKey);
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
}

describe("weather enrichment", () => {
  test("returns available weather from the provider", async () => {
    const provider = {
      getDailySummary: vi.fn(async () => weatherSummary)
    } satisfies WeatherProvider;

    await expect(createWeatherSummary(request, provider)).resolves.toEqual({
      status: "available",
      weatherSummary
    });
  });

  test("returns missing when the provider cannot resolve weather", async () => {
    const provider = {
      getDailySummary: vi.fn(async () => null)
    } satisfies WeatherProvider;

    await expect(createWeatherSummary(request, provider)).resolves.toEqual({
      status: "missing",
      weatherSummary: null
    });
  });

  test("degrades provider failures without leaking raw errors", async () => {
    const provider = {
      getDailySummary: vi.fn(async () => {
        throw new WeatherProviderError();
      })
    } satisfies WeatherProvider;

    await expect(createWeatherSummary(request, provider)).resolves.toEqual({
      status: "unavailable",
      weatherSummary: null
    });
  });

  test("preserves configuration errors for route-level structured responses", async () => {
    const provider = {
      getDailySummary: vi.fn(async () => {
        throw new WeatherProviderConfigurationError();
      })
    } satisfies WeatherProvider;

    await expect(createWeatherSummary(request, provider)).rejects.toBeInstanceOf(
      WeatherProviderConfigurationError
    );
  });

  test("uses cached weather on a second identical request", async () => {
    const provider = {
      getDailySummary: vi.fn(async () => weatherSummary)
    } satisfies WeatherProvider;
    const cache = createProviderResultCache(
      new InMemoryProviderResultRepository()
    );

    const firstResult = await createCachedWeatherSummary(
      request,
      provider,
      cache
    );
    const secondResult = await createCachedWeatherSummary(
      { city: "  Tokyo ", date: "2026-04-06", units: "metric" },
      provider,
      cache
    );

    expect(firstResult).toEqual({
      status: "available",
      weatherSummary
    });
    expect(secondResult).toEqual(firstResult);
    expect(provider.getDailySummary).toHaveBeenCalledTimes(1);
  });

  test("refreshes expired cached weather", async () => {
    const repository = new InMemoryProviderResultRepository();
    const cache = createProviderResultCache(repository);
    const identity = createProviderResultCacheIdentity({
      provider: "openweather",
      operation: "weather.summary",
      input: normalizeWeatherSummaryCacheInput(request)
    });
    await repository.upsert({
      provider: "openweather",
      operation: "weather.summary",
      cacheKey: identity.cacheKey,
      requestHash: identity.requestHash,
      requestJson: identity.normalizedInput,
      responseJson: {
        status: "missing",
        weatherSummary: null
      },
      expiresAt: new Date("2026-06-24T00:00:00.000Z")
    });
    const provider = {
      getDailySummary: vi.fn(async () => weatherSummary)
    } satisfies WeatherProvider;

    const result = await createCachedWeatherSummary(request, provider, cache);

    expect(result).toEqual({
      status: "available",
      weatherSummary
    });
    expect(provider.getDailySummary).toHaveBeenCalledTimes(1);
  });

  test("cache read and write failures do not break provider success", async () => {
    const repository = new InMemoryProviderResultRepository();
    repository.failRead = true;
    repository.failWrite = true;
    const cache = createProviderResultCache(repository);
    const provider = {
      getDailySummary: vi.fn(async () => weatherSummary)
    } satisfies WeatherProvider;

    await expect(
      createCachedWeatherSummary(request, provider, cache)
    ).resolves.toEqual({
      status: "available",
      weatherSummary
    });
    expect(provider.getDailySummary).toHaveBeenCalledTimes(1);
  });
});
