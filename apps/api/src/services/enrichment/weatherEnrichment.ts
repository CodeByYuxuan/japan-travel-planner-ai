import {
  WeatherProviderConfigurationError,
  WeatherProviderError,
  type WeatherProvider,
  type WeatherSummary,
  type WeatherSummaryRequest
} from "../../providers/weather/weatherProvider.js";

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
