import {
  WeatherProviderConfigurationError,
  WeatherProviderError,
  type WeatherProvider,
  type WeatherSummary,
  type WeatherSummaryRequest
} from "../../providers/weather/weatherProvider.js";
import type { ProviderResultCache } from "./cache.js";

export const weatherSummaryCacheTtlMs = 4 * 60 * 60 * 1000;

export type WeatherEnrichmentResult =
  | {
      status: "available";
      weatherSummary: WeatherSummary;
    }
  | {
      status: "missing" | "unavailable";
      weatherSummary: null;
    };

export async function createWeatherSummary(
  input: WeatherSummaryRequest,
  provider: WeatherProvider
): Promise<WeatherEnrichmentResult> {
  try {
    const weatherSummary = await provider.getDailySummary(input);

    if (weatherSummary === null) {
      return {
        status: "missing",
        weatherSummary: null
      };
    }

    return {
      status: "available",
      weatherSummary
    };
  } catch (error) {
    if (error instanceof WeatherProviderConfigurationError) {
      throw error;
    }

    if (error instanceof WeatherProviderError) {
      return {
        status: "unavailable",
        weatherSummary: null
      };
    }

    return {
      status: "unavailable",
      weatherSummary: null
    };
  }
}

function isWeatherSummary(value: unknown): value is WeatherSummary {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const summary = value as Partial<WeatherSummary>;

  return (
    typeof summary.condition === "string" &&
    typeof summary.date === "string" &&
    typeof summary.note === "string" &&
    typeof summary.temperatureUnit === "string" &&
    typeof summary.windSpeedUnit === "string"
  );
}

export function isWeatherEnrichmentResult(
  value: unknown
): value is WeatherEnrichmentResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const result = value as Partial<WeatherEnrichmentResult>;

  if (result.status === "available") {
    return isWeatherSummary(result.weatherSummary);
  }

  return (
    (result.status === "missing" || result.status === "unavailable") &&
    result.weatherSummary === null
  );
}

export function normalizeWeatherSummaryCacheInput(
  input: WeatherSummaryRequest
) {
  return {
    ...(input.city !== undefined ? { city: input.city } : {}),
    ...(input.countryCode !== undefined
      ? { countryCode: input.countryCode }
      : {}),
    date: input.date,
    ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
    ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
    units: input.units ?? "metric"
  };
}

export async function createCachedWeatherSummary(
  input: WeatherSummaryRequest,
  provider: WeatherProvider,
  cache: ProviderResultCache
): Promise<WeatherEnrichmentResult> {
  const result = await cache.getOrSet({
    provider: "openweather",
    operation: "weather.summary",
    input: normalizeWeatherSummaryCacheInput(input),
    ttlMs: weatherSummaryCacheTtlMs,
    load: () => createWeatherSummary(input, provider),
    isCachedValue: isWeatherEnrichmentResult,
    shouldCache: (weatherResult) => weatherResult.status !== "unavailable"
  });

  return result.value;
}
