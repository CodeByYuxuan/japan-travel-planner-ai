import { describe, expect, test, vi } from "vitest";

import {
  WeatherProviderConfigurationError,
  WeatherProviderError,
  createOpenWeatherProvider
} from "./weatherProvider.js";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json"
    },
    status
  });
}

function createFetchMock(responses: Response[]) {
  return vi.fn(async () => {
    const response = responses.shift();

    if (response === undefined) {
      throw new Error("Unexpected weather provider request.");
    }

    return response;
  }) as unknown as typeof fetch;
}

function getRequestedUrl(fetchMock: typeof fetch, index: number) {
  const requestInput = vi.mocked(fetchMock).mock.calls[index]?.[0];

  if (requestInput === undefined) {
    throw new Error(`Missing fetch call ${index}.`);
  }

  return new URL(String(requestInput));
}

const dailySummaryResponse = {
  date: "2026-04-06",
  cloud_cover: {
    afternoon: 45
  },
  humidity: {
    afternoon: 61
  },
  precipitation: {
    total: 1.24
  },
  temperature: {
    min: 12.42,
    max: 20.76
  },
  wind: {
    max: {
      speed: 5.24
    }
  }
};

describe("createOpenWeatherProvider", () => {
  test("fetches and normalizes daily weather by city and date", async () => {
    const fetchMock = createFetchMock([
      jsonResponse([
        {
          name: "Tokyo",
          lat: 35.6762,
          lon: 139.6503,
          country: "JP"
        }
      ]),
      jsonResponse(dailySummaryResponse)
    ]);
    const provider = createOpenWeatherProvider({
      apiKey: "weather-test-key",
      fetch: fetchMock
    });

    const summary = await provider.getDailySummary({
      city: "Tokyo",
      countryCode: "JP",
      date: "2026-04-06"
    });

    expect(summary).toEqual({
      city: "Tokyo",
      cloudCoverPercent: 45,
      condition: "Precipitation possible",
      coordinates: {
        latitude: 35.6762,
        longitude: 139.6503
      },
      date: "2026-04-06",
      humidityPercent: 61,
      note: "Precipitation possible, 12.4-20.8 C, 1.2 mm precipitation expected",
      precipitationProbabilityPercent: null,
      precipitationTotalMillimeters: 1.2,
      temperatureMax: 20.8,
      temperatureMin: 12.4,
      temperatureUnit: "celsius",
      windSpeed: 5.2,
      windSpeedUnit: "meters_per_second"
    });

    const geocodeUrl = getRequestedUrl(fetchMock, 0);
    const weatherUrl = getRequestedUrl(fetchMock, 1);

    expect(geocodeUrl.pathname).toBe("/geo/1.0/direct");
    expect(geocodeUrl.searchParams.get("q")).toBe("Tokyo,JP");
    expect(geocodeUrl.searchParams.get("appid")).toBe("weather-test-key");
    expect(weatherUrl.pathname).toBe("/data/3.0/onecall/day_summary");
    expect(weatherUrl.searchParams.get("lat")).toBe("35.6762");
    expect(weatherUrl.searchParams.get("lon")).toBe("139.6503");
    expect(weatherUrl.searchParams.get("date")).toBe("2026-04-06");
    expect(weatherUrl.searchParams.get("units")).toBe("metric");
    expect(weatherUrl.searchParams.get("appid")).toBe("weather-test-key");
  });

  test("uses provided coordinates without geocoding", async () => {
    const fetchMock = createFetchMock([jsonResponse(dailySummaryResponse)]);
    const provider = createOpenWeatherProvider({
      apiKey: "weather-test-key",
      fetch: fetchMock
    });

    const summary = await provider.getDailySummary({
      city: "Kyoto",
      date: "2026-04-07",
      latitude: 35.0116,
      longitude: 135.7681,
      units: "imperial"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({
      city: "Kyoto",
      coordinates: {
        latitude: 35.0116,
        longitude: 135.7681
      },
      temperatureUnit: "fahrenheit",
      windSpeedUnit: "miles_per_hour"
    });
  });

  test("returns null when city geocoding has no result", async () => {
    const fetchMock = createFetchMock([jsonResponse([])]);
    const provider = createOpenWeatherProvider({
      apiKey: "weather-test-key",
      fetch: fetchMock
    });

    await expect(
      provider.getDailySummary({
        city: "Unknown Place",
        date: "2026-04-06"
      })
    ).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("fails clearly when WEATHER_API_KEY is missing", async () => {
    const fetchMock = createFetchMock([]);
    const provider = createOpenWeatherProvider({
      fetch: fetchMock
    });

    await expect(
      provider.getDailySummary({
        city: "Tokyo",
        date: "2026-04-06"
      })
    ).rejects.toBeInstanceOf(WeatherProviderConfigurationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("wraps provider and network failures safely", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network unavailable");
    }) as unknown as typeof fetch;
    const provider = createOpenWeatherProvider({
      apiKey: "weather-test-key",
      fetch: fetchMock
    });

    await expect(
      provider.getDailySummary({
        city: "Tokyo",
        date: "2026-04-06"
      })
    ).rejects.toBeInstanceOf(WeatherProviderError);
  });

  test("normalizes sparse provider responses with missing weather fields", async () => {
    const fetchMock = createFetchMock([
      jsonResponse({
        date: "2026-04-08",
        cloud_cover: {
          afternoon: 82
        }
      })
    ]);
    const provider = createOpenWeatherProvider({
      apiKey: "weather-test-key",
      fetch: fetchMock
    });

    const summary = await provider.getDailySummary({
      date: "2026-04-08",
      latitude: 35.0116,
      longitude: 135.7681
    });

    expect(summary).toMatchObject({
      city: null,
      cloudCoverPercent: 82,
      condition: "Cloudy",
      humidityPercent: null,
      note: "Cloudy, low precipitation expected",
      precipitationProbabilityPercent: null,
      precipitationTotalMillimeters: null,
      temperatureMax: null,
      temperatureMin: null,
      windSpeed: null
    });
  });
});
