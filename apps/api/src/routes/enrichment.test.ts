import request from "supertest";
import { describe, expect, test, vi } from "vitest";

import { apiErrorSchema } from "@japan-travel-planner/shared";

import { createApp } from "../app.js";
import { defaultApiEnv } from "../config/env.js";
import {
  HotelProviderError,
  type HotelProvider,
  type HotelSuggestion
} from "../providers/hotels/hotelProvider.js";
import type { MapsProvider } from "../providers/maps/mapsProvider.js";
import {
  WeatherProviderError,
  type WeatherProvider,
  type WeatherSummary
} from "../providers/weather/weatherProvider.js";
import type {
  ProviderResultRecord,
  ProviderResultRepository,
  ProviderResultWriteInput
} from "../repositories/providerResultRepository.js";
import {
  createProviderResultCache,
  type ProviderResultCache
} from "../services/enrichment/cache.js";

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

function createEnrichmentTestApp(
  options: {
    hotelProvider?: HotelProvider | undefined;
    mapsProvider?: MapsProvider | undefined;
    providerResultCache?: ProviderResultCache | undefined;
    weatherProvider?: WeatherProvider | undefined;
  } = {}
) {
  return createApp({
    env: defaultApiEnv,
    providerResultCache:
      options.providerResultCache ?? createMemoryProviderResultCache(),
    ...(options.hotelProvider !== undefined
      ? { hotelProvider: options.hotelProvider }
      : {}),
    ...(options.mapsProvider !== undefined
      ? { mapsProvider: options.mapsProvider }
      : {}),
    ...(options.weatherProvider !== undefined
      ? { weatherProvider: options.weatherProvider }
      : {})
  });
}

class InMemoryProviderResultRepository implements ProviderResultRepository {
  private readonly records = new Map<string, ProviderResultRecord>();
  private nextId = 1;

  async findUsable(cacheKey: string, now = new Date()) {
    const record = this.records.get(cacheKey);

    if (record === undefined || record.expiresAt <= now) {
      return null;
    }

    return structuredClone(record);
  }

  async upsert(input: ProviderResultWriteInput) {
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

function createMemoryProviderResultCache() {
  return createProviderResultCache(new InMemoryProviderResultRepository());
}

const hotelSuggestion = {
  access: "3 minutes walk from Tokyo Station.",
  address: "Tokyo Chiyoda City Marunouchi 1-1-1",
  amenities: ["Wi-Fi", "Large bath"],
  bookingUrl: "https://travel.rakuten.co.jp/plan-list",
  city: "Tokyo",
  currency: "JPY",
  description: "A convenient base for rail-friendly Tokyo days.",
  id: "rakuten-travel:123456",
  imageUrl: "https://img.travel.rakuten.co.jp/hotel.jpg",
  latitude: 35.6812,
  longitude: 139.7671,
  mapUrl: "https://www.google.com/maps/search/?api=1&query=35.6812%2C139.7671",
  name: "Tokyo Station Stay",
  priceFrom: 18000,
  provider: "rakuten-travel",
  rating: 4.5,
  reviewCount: 321,
  sourceUpdatedAt: null,
  tags: ["Near Tokyo Station"],
  thumbnailUrl: "https://img.travel.rakuten.co.jp/thumb.jpg"
} satisfies HotelSuggestion;

describe("POST /api/enrichment/hotels/suggestions", () => {
  test("returns normalized hotel suggestions", async () => {
    const hotelProvider = {
      name: "test-hotel-provider",
      searchHotels: vi.fn(async () => [hotelSuggestion])
    } satisfies HotelProvider;
    const response = await request(createEnrichmentTestApp({ hotelProvider }))
      .post("/api/enrichment/hotels/suggestions")
      .send({
        budget: "moderate",
        city: "Tokyo",
        endDate: "2026-04-08",
        startDate: "2026-04-06"
      });

    expect(response.status).toBe(200);
    expect(hotelProvider.searchHotels).toHaveBeenCalledWith({
      budget: "moderate",
      city: "Tokyo",
      endDate: "2026-04-08",
      maxResults: 6,
      radiusKm: 2,
      startDate: "2026-04-06"
    });
    expect(response.body).toEqual({
      hotelSuggestions: [hotelSuggestion],
      status: "available"
    });
  });

  test("returns structured validation errors for invalid hotel input", async () => {
    const response = await request(
      createEnrichmentTestApp({
        hotelProvider: {
          name: "test-hotel-provider",
          searchHotels: vi.fn(async () => [hotelSuggestion])
        }
      })
    )
      .post("/api/enrichment/hotels/suggestions")
      .send({
        city: "",
        endDate: "2026-04-06",
        latitude: 35.6812,
        startDate: "2026-04-08"
      });

    expect(response.status).toBe(400);
    expect(apiErrorSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Request validation failed."
    });
    expect(response.body.error.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "city"
        }),
        expect.objectContaining({
          path: "endDate"
        }),
        expect.objectContaining({
          path: "longitude"
        })
      ])
    );
  });

  test("returns a structured missing config error when Rakuten config is absent", async () => {
    const response = await request(createEnrichmentTestApp())
      .post("/api/enrichment/hotels/suggestions")
      .send({
        city: "Tokyo",
        endDate: "2026-04-08",
        startDate: "2026-04-06"
      });

    expect(response.status).toBe(503);
    expect(apiErrorSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.error).toEqual({
      code: "HOTEL_PROVIDER_CONFIGURATION_ERROR",
      message: "Hotel enrichment is not configured."
    });
  });

  test("degrades provider failure to unavailable hotel suggestions", async () => {
    const hotelProvider = {
      name: "test-hotel-provider",
      searchHotels: vi.fn(async () => {
        throw new HotelProviderError();
      })
    } satisfies HotelProvider;
    const response = await request(createEnrichmentTestApp({ hotelProvider }))
      .post("/api/enrichment/hotels/suggestions")
      .send({
        city: "Tokyo",
        endDate: "2026-04-08",
        startDate: "2026-04-06"
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      hotelSuggestions: [],
      status: "unavailable"
    });
  });

  test("returns empty hotel suggestions when provider has no matches", async () => {
    const hotelProvider = {
      name: "test-hotel-provider",
      searchHotels: vi.fn(async () => [])
    } satisfies HotelProvider;
    const response = await request(createEnrichmentTestApp({ hotelProvider }))
      .post("/api/enrichment/hotels/suggestions")
      .send({
        city: "Unknown City",
        endDate: "2026-04-08",
        startDate: "2026-04-06"
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      hotelSuggestions: [],
      status: "empty"
    });
  });

  test("uses cached hotels for a second identical enrichment request", async () => {
    const hotelProvider = {
      name: "test-hotel-provider",
      searchHotels: vi.fn(async () => [hotelSuggestion])
    } satisfies HotelProvider;
    const app = createEnrichmentTestApp({ hotelProvider });
    const payload = {
      city: "Tokyo",
      endDate: "2026-04-08",
      startDate: "2026-04-06"
    };

    const firstResponse = await request(app)
      .post("/api/enrichment/hotels/suggestions")
      .send(payload);
    const secondResponse = await request(app)
      .post("/api/enrichment/hotels/suggestions")
      .send({
        city: "  tokyo ",
        endDate: "2026-04-08",
        maxResults: 6,
        radiusKm: 2,
        startDate: "2026-04-06"
      });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body).toEqual(firstResponse.body);
    expect(hotelProvider.searchHotels).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/enrichment/maps/link", () => {
  test("returns an external Google Maps search link", async () => {
    const response = await request(createEnrichmentTestApp())
      .post("/api/enrichment/maps/link")
      .send({
        title: "Senso-ji morning visit",
        location: {
          name: "Senso-ji",
          city: "Tokyo"
        }
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      mapUrl:
        "https://www.google.com/maps/search/?api=1&query=Senso-ji%20morning%20visit%20Senso-ji%20Tokyo"
    });
  });

  test("returns null when no usable location is provided", async () => {
    const response = await request(createEnrichmentTestApp())
      .post("/api/enrichment/maps/link")
      .send({
        title: "Only a title",
        location: {
          name: " "
        }
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      mapUrl: null
    });
  });

  test("returns structured validation errors for invalid map link input", async () => {
    const response = await request(createEnrichmentTestApp())
      .post("/api/enrichment/maps/link")
      .send({
        location: {
          latitude: 120,
          longitude: 139.7967
        }
      });

    expect(response.status).toBe(400);
    expect(apiErrorSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Request validation failed."
    });
    expect(response.body.error.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "location.latitude"
        })
      ])
    );
  });

  test("degrades gracefully when the maps provider fails", async () => {
    const mapsProvider = {
      createSearchLink: vi.fn(() => {
        throw new Error("provider unavailable");
      })
    } satisfies MapsProvider;
    const response = await request(createEnrichmentTestApp({ mapsProvider }))
      .post("/api/enrichment/maps/link")
      .send({
        title: "Senso-ji morning visit",
        location: {
          name: "Senso-ji",
          city: "Tokyo"
        }
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      mapUrl: null
    });
  });
});

describe("POST /api/enrichment/weather/summary", () => {
  test("returns an available weather summary", async () => {
    const weatherProvider = {
      getDailySummary: vi.fn(async () => weatherSummary)
    } satisfies WeatherProvider;
    const response = await request(createEnrichmentTestApp({ weatherProvider }))
      .post("/api/enrichment/weather/summary")
      .send({
        city: "Tokyo",
        countryCode: "jp",
        date: "2026-04-06"
      });

    expect(response.status).toBe(200);
    expect(weatherProvider.getDailySummary).toHaveBeenCalledWith({
      city: "Tokyo",
      countryCode: "JP",
      date: "2026-04-06",
      units: "metric"
    });
    expect(response.body).toEqual({
      status: "available",
      weatherSummary
    });
  });

  test("returns a structured missing config error when WEATHER_API_KEY is absent", async () => {
    const response = await request(createEnrichmentTestApp())
      .post("/api/enrichment/weather/summary")
      .send({
        city: "Tokyo",
        date: "2026-04-06"
      });

    expect(response.status).toBe(503);
    expect(apiErrorSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.error).toEqual({
      code: "WEATHER_PROVIDER_CONFIGURATION_ERROR",
      message: "Weather enrichment is not configured."
    });
  });

  test("degrades provider failure to unavailable weather", async () => {
    const weatherProvider = {
      getDailySummary: vi.fn(async () => {
        throw new WeatherProviderError();
      })
    } satisfies WeatherProvider;
    const response = await request(createEnrichmentTestApp({ weatherProvider }))
      .post("/api/enrichment/weather/summary")
      .send({
        date: "2026-04-06",
        latitude: 35.6762,
        longitude: 139.6503
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "unavailable",
      weatherSummary: null
    });
  });

  test("returns missing weather when city or coordinates cannot resolve", async () => {
    const weatherProvider = {
      getDailySummary: vi.fn(async () => null)
    } satisfies WeatherProvider;
    const response = await request(createEnrichmentTestApp({ weatherProvider }))
      .post("/api/enrichment/weather/summary")
      .send({
        city: "Unknown Place",
        date: "2026-04-06"
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "missing",
      weatherSummary: null
    });
  });

  test("returns structured validation errors for invalid weather input", async () => {
    const response = await request(
      createEnrichmentTestApp({
        weatherProvider: {
          getDailySummary: vi.fn(async () => weatherSummary)
        }
      })
    )
      .post("/api/enrichment/weather/summary")
      .send({
        date: "04-06-2026",
        latitude: 35.6762
      });

    expect(response.status).toBe(400);
    expect(apiErrorSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Request validation failed."
    });
    expect(response.body.error.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "date"
        }),
        expect.objectContaining({
          path: "longitude"
        }),
        expect.objectContaining({
          path: "city"
        })
      ])
    );
  });

  test("uses cached weather for a second identical enrichment request", async () => {
    const weatherProvider = {
      getDailySummary: vi.fn(async () => weatherSummary)
    } satisfies WeatherProvider;
    const app = createEnrichmentTestApp({ weatherProvider });
    const payload = {
      city: "Tokyo",
      date: "2026-04-06"
    };

    const firstResponse = await request(app)
      .post("/api/enrichment/weather/summary")
      .send(payload);
    const secondResponse = await request(app)
      .post("/api/enrichment/weather/summary")
      .send({
        city: "  tokyo ",
        date: "2026-04-06",
        units: "metric"
      });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body).toEqual(firstResponse.body);
    expect(secondResponse.body).toEqual({
      status: "available",
      weatherSummary
    });
    expect(weatherProvider.getDailySummary).toHaveBeenCalledTimes(1);
  });
});
