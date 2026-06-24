import { z } from "zod";

export type WeatherUnits = "metric" | "imperial" | "standard";

export type TemperatureUnit = "celsius" | "fahrenheit" | "kelvin";

export type WindSpeedUnit = "meters_per_second" | "miles_per_hour";

export type WeatherSummaryRequest = {
  city?: string | undefined;
  countryCode?: string | undefined;
  date: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
  units?: WeatherUnits | undefined;
};

export type WeatherSummary = {
  city: string | null;
  cloudCoverPercent: number | null;
  condition: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  date: string;
  humidityPercent: number | null;
  note: string;
  precipitationProbabilityPercent: number | null;
  precipitationTotalMillimeters: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  temperatureUnit: TemperatureUnit;
  windSpeed: number | null;
  windSpeedUnit: WindSpeedUnit;
};

export type WeatherProvider = {
  getDailySummary: (
    input: WeatherSummaryRequest
  ) => Promise<WeatherSummary | null>;
};

export type OpenWeatherProviderOptions = {
  apiKey?: string | undefined;
  fetch?: typeof fetch | undefined;
  geocodingBaseUrl?: string | undefined;
  weatherBaseUrl?: string | undefined;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

const defaultGeocodingBaseUrl =
  "https://api.openweathermap.org/geo/1.0/direct";
const defaultWeatherBaseUrl =
  "https://api.openweathermap.org/data/3.0/onecall/day_summary";

const geocodingResponseSchema = z.array(
  z
    .object({
      country: z.string().optional(),
      lat: z.number(),
      lon: z.number(),
      name: z.string().optional()
    })
    .passthrough()
);

const dailySummaryResponseSchema = z
  .object({
    cloud_cover: z
      .object({
        afternoon: z.number().nullable().optional()
      })
      .passthrough()
      .optional(),
    date: z.string().optional(),
    humidity: z
      .object({
        afternoon: z.number().nullable().optional()
      })
      .passthrough()
      .optional(),
    precipitation: z
      .object({
        total: z.number().nullable().optional()
      })
      .passthrough()
      .optional(),
    temperature: z
      .object({
        max: z.number().nullable().optional(),
        min: z.number().nullable().optional()
      })
      .passthrough()
      .optional(),
    wind: z
      .object({
        max: z
          .object({
            speed: z.number().nullable().optional()
          })
          .passthrough()
          .optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

type DailySummaryResponse = z.infer<typeof dailySummaryResponseSchema>;

export class WeatherProviderConfigurationError extends Error {
  constructor() {
    super("Weather provider is not configured.");
    this.name = "WeatherProviderConfigurationError";
  }
}

export class WeatherProviderError extends Error {
  constructor() {
    super("Weather provider request failed.");
    this.name = "WeatherProviderError";
  }
}

function cleanApiKey(apiKey: string | undefined) {
  const trimmedApiKey = apiKey?.trim();

  return trimmedApiKey && trimmedApiKey.length > 0 ? trimmedApiKey : null;
}

function requireApiKey(apiKey: string | undefined) {
  const configuredApiKey = cleanApiKey(apiKey);

  if (configuredApiKey === null) {
    throw new WeatherProviderConfigurationError();
  }

  return configuredApiKey;
}

function optionalNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function roundToOneDecimal(value: number | null) {
  return value === null ? null : Math.round(value * 10) / 10;
}

function getTemperatureUnit(units: WeatherUnits): TemperatureUnit {
  if (units === "imperial") {
    return "fahrenheit";
  }

  if (units === "standard") {
    return "kelvin";
  }

  return "celsius";
}

function getWindSpeedUnit(units: WeatherUnits): WindSpeedUnit {
  return units === "imperial" ? "miles_per_hour" : "meters_per_second";
}

function getTemperatureSymbol(unit: TemperatureUnit) {
  if (unit === "fahrenheit") {
    return "F";
  }

  if (unit === "kelvin") {
    return "K";
  }

  return "C";
}

function formatTemperatureRange(
  minTemperature: number | null,
  maxTemperature: number | null,
  unit: TemperatureUnit
) {
  const symbol = getTemperatureSymbol(unit);

  if (minTemperature !== null && maxTemperature !== null) {
    return `${minTemperature}-${maxTemperature} ${symbol}`;
  }

  if (minTemperature !== null) {
    return `from ${minTemperature} ${symbol}`;
  }

  if (maxTemperature !== null) {
    return `up to ${maxTemperature} ${symbol}`;
  }

  return null;
}

function deriveCondition(options: {
  cloudCoverPercent: number | null;
  precipitationTotalMillimeters: number | null;
}) {
  if (
    options.precipitationTotalMillimeters !== null &&
    options.precipitationTotalMillimeters > 0
  ) {
    return "Precipitation possible";
  }

  if (
    options.cloudCoverPercent !== null &&
    options.cloudCoverPercent >= 70
  ) {
    return "Cloudy";
  }

  if (
    options.cloudCoverPercent !== null &&
    options.cloudCoverPercent >= 35
  ) {
    return "Partly cloudy";
  }

  return "Mostly clear";
}

function createWeatherNote(options: {
  condition: string;
  precipitationTotalMillimeters: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  temperatureUnit: TemperatureUnit;
}) {
  const temperatureRange = formatTemperatureRange(
    options.temperatureMin,
    options.temperatureMax,
    options.temperatureUnit
  );
  const precipitationNote =
    options.precipitationTotalMillimeters !== null &&
    options.precipitationTotalMillimeters > 0
      ? `${options.precipitationTotalMillimeters} mm precipitation expected`
      : "low precipitation expected";

  return [
    options.condition,
    temperatureRange,
    precipitationNote
  ]
    .filter((part): part is string => part !== null)
    .join(", ");
}

async function fetchJson(fetchImpl: typeof fetch, url: URL) {
  let response: Response;

  try {
    response = await fetchImpl(url);
  } catch {
    throw new WeatherProviderError();
  }

  if (!response.ok) {
    throw new WeatherProviderError();
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new WeatherProviderError();
  }
}

function getCoordinatesFromInput(input: WeatherSummaryRequest) {
  if (
    input.latitude === undefined ||
    input.longitude === undefined ||
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude)
  ) {
    return null;
  }

  return {
    latitude: input.latitude,
    longitude: input.longitude
  };
}

async function geocodeCity(options: {
  apiKey: string;
  city: string;
  countryCode?: string | undefined;
  fetchImpl: typeof fetch;
  geocodingBaseUrl: string;
}) {
  const url = new URL(options.geocodingBaseUrl);
  const query = [options.city.trim(), options.countryCode?.trim()]
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join(",");

  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");
  url.searchParams.set("appid", options.apiKey);

  const body = await fetchJson(options.fetchImpl, url);
  const parsedBody = geocodingResponseSchema.safeParse(body);

  if (!parsedBody.success) {
    throw new WeatherProviderError();
  }

  const firstResult = parsedBody.data[0];

  if (firstResult === undefined) {
    return null;
  }

  return {
    city: firstResult.name ?? options.city,
    coordinates: {
      latitude: firstResult.lat,
      longitude: firstResult.lon
    }
  };
}

export function normalizeOpenWeatherDailySummary(options: {
  city: string | null;
  coordinates: Coordinates;
  date: string;
  response: DailySummaryResponse;
  units: WeatherUnits;
}): WeatherSummary {
  const cloudCoverPercent = optionalNumber(
    options.response.cloud_cover?.afternoon
  );
  const humidityPercent = optionalNumber(options.response.humidity?.afternoon);
  const precipitationTotalMillimeters = roundToOneDecimal(
    optionalNumber(options.response.precipitation?.total)
  );
  const temperatureUnit = getTemperatureUnit(options.units);
  const temperatureMax = roundToOneDecimal(
    optionalNumber(options.response.temperature?.max)
  );
  const temperatureMin = roundToOneDecimal(
    optionalNumber(options.response.temperature?.min)
  );
  const windSpeed = roundToOneDecimal(
    optionalNumber(options.response.wind?.max?.speed)
  );
  const condition = deriveCondition({
    cloudCoverPercent,
    precipitationTotalMillimeters
  });

  return {
    city: options.city,
    cloudCoverPercent,
    condition,
    coordinates: options.coordinates,
    date: options.response.date ?? options.date,
    humidityPercent,
    note: createWeatherNote({
      condition,
      precipitationTotalMillimeters,
      temperatureMax,
      temperatureMin,
      temperatureUnit
    }),
    precipitationProbabilityPercent: null,
    precipitationTotalMillimeters,
    temperatureMax,
    temperatureMin,
    temperatureUnit,
    windSpeed,
    windSpeedUnit: getWindSpeedUnit(options.units)
  };
}

export function createOpenWeatherProvider(
  options: OpenWeatherProviderOptions = {}
): WeatherProvider {
  const fetchImpl = options.fetch ?? fetch;
  const geocodingBaseUrl =
    options.geocodingBaseUrl ?? defaultGeocodingBaseUrl;
  const weatherBaseUrl = options.weatherBaseUrl ?? defaultWeatherBaseUrl;

  return {
    async getDailySummary(input) {
      const apiKey = requireApiKey(options.apiKey);
      const units = input.units ?? "metric";
      let coordinates = getCoordinatesFromInput(input);
      let city = input.city?.trim() || null;

      if (coordinates === null && city !== null) {
        const geocodedLocation = await geocodeCity({
          apiKey,
          city,
          countryCode: input.countryCode,
          fetchImpl,
          geocodingBaseUrl
        });

        if (geocodedLocation === null) {
          return null;
        }

        city = geocodedLocation.city;
        coordinates = geocodedLocation.coordinates;
      }

      if (coordinates === null) {
        return null;
      }

      const url = new URL(weatherBaseUrl);
      url.searchParams.set("lat", String(coordinates.latitude));
      url.searchParams.set("lon", String(coordinates.longitude));
      url.searchParams.set("date", input.date);
      url.searchParams.set("units", units);
      url.searchParams.set("appid", apiKey);

      const body = await fetchJson(fetchImpl, url);
      const parsedBody = dailySummaryResponseSchema.safeParse(body);

      if (!parsedBody.success) {
        throw new WeatherProviderError();
      }

      return normalizeOpenWeatherDailySummary({
        city,
        coordinates,
        date: input.date,
        response: parsedBody.data,
        units
      });
    }
  };
}
