import { describe, expect, test, vi } from "vitest";

import {
  WeatherProviderConfigurationError,
  WeatherProviderError,
  type WeatherProvider,
  type WeatherSummary
} from "../../providers/weather/weatherProvider.js";
import { createWeatherSummary } from "./weatherEnrichment.js";

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
});
