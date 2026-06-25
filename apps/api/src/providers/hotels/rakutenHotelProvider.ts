import { z } from "zod";

import type { MapLinkInput } from "../maps/mapsProvider.js";
import {
  createGoogleMapsSearchLink,
  createGoogleMapsSearchUrl
} from "../maps/mapsProvider.js";
import {
  HotelProviderConfigurationError,
  HotelProviderError,
  type HotelProvider,
  type HotelSearchBudget,
  type HotelSuggestion,
  type HotelSuggestionRequest
} from "./hotelProvider.js";

export type RakutenHotelProviderOptions = {
  accessKey?: string | undefined;
  appId?: string | undefined;
  baseUrl?: string | undefined;
  fetch?: typeof fetch | undefined;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

const rakutenProviderName = "rakuten-travel";
const defaultBaseUrl =
  "https://openapi.rakuten.co.jp/engine/api/Travel/SimpleHotelSearch/20170426";

const knownCityCenters: Record<string, Coordinates> = {
  fukuoka: { latitude: 33.5902, longitude: 130.4017 },
  hiroshima: { latitude: 34.3853, longitude: 132.4553 },
  kanazawa: { latitude: 36.5613, longitude: 136.6562 },
  kobe: { latitude: 34.6901, longitude: 135.1955 },
  kyoto: { latitude: 35.0116, longitude: 135.7681 },
  nagoya: { latitude: 35.1815, longitude: 136.9066 },
  nara: { latitude: 34.6851, longitude: 135.8048 },
  okinawa: { latitude: 26.2124, longitude: 127.6809 },
  osaka: { latitude: 34.6937, longitude: 135.5023 },
  sapporo: { latitude: 43.0618, longitude: 141.3545 },
  tokyo: { latitude: 35.6812, longitude: 139.7671 },
  yokohama: { latitude: 35.4437, longitude: 139.638 }
};

const hotelBasicInfoSchema = z
  .object({
    access: z.string().nullable().optional(),
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    areaName: z.string().nullable().optional(),
    hotelImageUrl: z.string().nullable().optional(),
    hotelInformationUrl: z.string().nullable().optional(),
    hotelMinCharge: z.number().nullable().optional(),
    hotelName: z.string().nullable().optional(),
    hotelNo: z.union([z.number(), z.string()]).nullable().optional(),
    hotelSpecial: z.string().nullable().optional(),
    hotelThumbnailUrl: z.string().nullable().optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    nearestStation: z.string().nullable().optional(),
    planListUrl: z.string().nullable().optional(),
    reviewAverage: z.union([z.number(), z.string()]).nullable().optional(),
    reviewCount: z.union([z.number(), z.string()]).nullable().optional(),
    userReview: z.string().nullable().optional()
  })
  .passthrough();

const hotelRatingInfoSchema = z
  .object({
    equipmentAverage: z.union([z.number(), z.string()]).nullable().optional(),
    locationAverage: z.union([z.number(), z.string()]).nullable().optional(),
    mealAverage: z.union([z.number(), z.string()]).nullable().optional(),
    roomAverage: z.union([z.number(), z.string()]).nullable().optional(),
    serviceAverage: z.union([z.number(), z.string()]).nullable().optional()
  })
  .passthrough();

const hotelFacilitiesInfoSchema = z
  .object({
    hotelFacilities: z
      .union([
        z.array(z.object({ item: z.string().optional() }).passthrough()),
        z
          .object({
            item: z.union([z.string(), z.array(z.string())]).optional()
          })
          .passthrough()
      ])
      .optional()
  })
  .passthrough();

const rakutenResponseSchema = z
  .object({
    hotels: z.array(z.unknown()).optional(),
    pagingInfo: z.unknown().optional()
  })
  .passthrough();

function cleanConfigValue(value: string | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : null;
}

function requireRakutenConfig(options: {
  accessKey?: string | undefined;
  appId?: string | undefined;
}) {
  const appId = cleanConfigValue(options.appId);
  const accessKey = cleanConfigValue(options.accessKey);

  if (appId === null || accessKey === null) {
    throw new HotelProviderConfigurationError();
  }

  return { accessKey, appId };
}

function normalizeCityKey(city: string) {
  return city.trim().toLowerCase().replace(/\s+/g, " ");
}

function getCoordinates(input: HotelSuggestionRequest) {
  if (
    input.latitude !== undefined &&
    input.longitude !== undefined &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
  ) {
    return {
      latitude: input.latitude,
      longitude: input.longitude
    };
  }

  return knownCityCenters[normalizeCityKey(input.city)] ?? null;
}

function clampHits(maxResults: number | undefined) {
  if (maxResults === undefined) {
    return 6;
  }

  return Math.min(30, Math.max(1, Math.trunc(maxResults)));
}

function clampSearchRadius(radiusKm: number | undefined) {
  if (radiusKm === undefined) {
    return 2;
  }

  return Math.min(3, Math.max(0.1, Math.round(radiusKm * 10) / 10));
}

function getSortForBudget(budget: HotelSearchBudget | undefined) {
  if (budget === "budget") {
    return "+roomCharge";
  }

  if (budget === "luxury") {
    return "-roomCharge";
  }

  return "standard";
}

export function buildRakutenSimpleHotelSearchUrl(options: {
  appId: string;
  baseUrl?: string | undefined;
  input: HotelSuggestionRequest;
}) {
  const coordinates = getCoordinates(options.input);

  if (coordinates === null) {
    return null;
  }

  const url = new URL(options.baseUrl ?? defaultBaseUrl);

  url.searchParams.set("applicationId", options.appId);
  url.searchParams.set("format", "json");
  url.searchParams.set("formatVersion", "2");
  url.searchParams.set("datumType", "1");
  url.searchParams.set("latitude", String(coordinates.latitude));
  url.searchParams.set("longitude", String(coordinates.longitude));
  url.searchParams.set(
    "searchRadius",
    String(clampSearchRadius(options.input.radiusKm))
  );
  url.searchParams.set("hits", String(clampHits(options.input.maxResults)));
  url.searchParams.set("page", "1");
  url.searchParams.set("responseType", "middle");
  url.searchParams.set("sort", getSortForBudget(options.input.budget));
  url.searchParams.set("hotelThumbnailSize", "2");

  return url;
}

async function fetchJson(fetchImpl: typeof fetch, url: URL, accessKey: string) {
  let response: Response;

  try {
    response = await fetchImpl(url, {
      headers: {
        accessKey
      }
    });
  } catch {
    throw new HotelProviderError();
  }

  if (!response.ok) {
    throw new HotelProviderError();
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new HotelProviderError();
  }
}

function parseNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function cleanText(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : null;
}

function buildAddress(basicInfo: z.infer<typeof hotelBasicInfoSchema>) {
  return (
    [cleanText(basicInfo.address1), cleanText(basicInfo.address2)]
      .filter((part): part is string => part !== null)
      .join(" ") || null
  );
}

function formatNearestStationTag(nearestStation: string | null) {
  if (nearestStation === null) {
    return null;
  }

  return nearestStation.toLowerCase().endsWith("station")
    ? `Near ${nearestStation}`
    : `Near ${nearestStation} Station`;
}

function buildTags(options: {
  basicInfo: z.infer<typeof hotelBasicInfoSchema>;
  ratingInfo: z.infer<typeof hotelRatingInfoSchema> | null;
}) {
  const nearestStation = cleanText(options.basicInfo.nearestStation);
  const tags = [
    formatNearestStationTag(nearestStation),
    parseNumber(options.ratingInfo?.locationAverage) !== null
      ? `Location ${parseNumber(options.ratingInfo?.locationAverage)}`
      : null,
    parseNumber(options.ratingInfo?.serviceAverage) !== null
      ? `Service ${parseNumber(options.ratingInfo?.serviceAverage)}`
      : null
  ];

  return tags.filter((tag): tag is string => tag !== null);
}

function getHotelSection(
  value: unknown,
  key: "hotelBasicInfo" | "hotelFacilitiesInfo" | "hotelRatingInfo"
) {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const entry = value as Record<string, unknown>;

  if (entry[key] !== undefined) {
    return entry[key];
  }

  const hotel = entry.hotel;

  if (Array.isArray(hotel)) {
    for (const section of hotel) {
      if (typeof section === "object" && section !== null && key in section) {
        return (section as Record<string, unknown>)[key];
      }
    }
  }

  if (typeof hotel === "object" && hotel !== null && key in hotel) {
    return (hotel as Record<string, unknown>)[key];
  }

  return null;
}

function normalizeAmenities(
  facilitiesInfo: z.infer<typeof hotelFacilitiesInfoSchema> | null
) {
  const hotelFacilities = facilitiesInfo?.hotelFacilities;

  if (hotelFacilities === undefined) {
    return [];
  }

  if (Array.isArray(hotelFacilities)) {
    return hotelFacilities
      .map((facility) => cleanText(facility.item))
      .filter((facility): facility is string => facility !== null);
  }

  const item = hotelFacilities.item;

  if (Array.isArray(item)) {
    return item
      .map((facility) => cleanText(facility))
      .filter((facility): facility is string => facility !== null);
  }

  const cleanedItem = cleanText(item);

  return cleanedItem === null ? [] : [cleanedItem];
}

function getMapUrl(options: {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  name: string;
}) {
  if (options.latitude !== null && options.longitude !== null) {
    return createGoogleMapsSearchUrl(
      `${options.latitude},${options.longitude}`
    );
  }

  return createGoogleMapsSearchLink({
    location: {
      address: options.address ?? undefined,
      name: options.name
    }
  } satisfies MapLinkInput);
}

function normalizeHotel(
  hotel: unknown,
  input: HotelSuggestionRequest
): HotelSuggestion | null {
  const basicInfoResult = hotelBasicInfoSchema.safeParse(
    getHotelSection(hotel, "hotelBasicInfo")
  );

  if (!basicInfoResult.success) {
    return null;
  }

  const basicInfo = basicInfoResult.data;
  const name = cleanText(basicInfo.hotelName);
  const hotelNo = cleanText(String(basicInfo.hotelNo ?? ""));

  if (name === null || hotelNo === null) {
    return null;
  }

  const ratingInfoResult = hotelRatingInfoSchema.safeParse(
    getHotelSection(hotel, "hotelRatingInfo")
  );
  const facilitiesInfoResult = hotelFacilitiesInfoSchema.safeParse(
    getHotelSection(hotel, "hotelFacilitiesInfo")
  );
  const ratingInfo = ratingInfoResult.success ? ratingInfoResult.data : null;
  const facilitiesInfo = facilitiesInfoResult.success
    ? facilitiesInfoResult.data
    : null;
  const address = buildAddress(basicInfo);
  const latitude = parseNumber(basicInfo.latitude);
  const longitude = parseNumber(basicInfo.longitude);
  const bookingUrl =
    cleanText(basicInfo.planListUrl) ??
    cleanText(basicInfo.hotelInformationUrl);

  return {
    access: cleanText(basicInfo.access),
    address,
    amenities: normalizeAmenities(facilitiesInfo),
    bookingUrl,
    city: cleanText(basicInfo.areaName) ?? input.city,
    currency: "JPY",
    description:
      cleanText(basicInfo.hotelSpecial) ??
      cleanText(basicInfo.userReview) ??
      cleanText(basicInfo.access),
    id: `${rakutenProviderName}:${hotelNo}`,
    imageUrl: cleanText(basicInfo.hotelImageUrl),
    latitude,
    longitude,
    mapUrl: getMapUrl({ address, latitude, longitude, name }),
    name,
    priceFrom: parseNumber(basicInfo.hotelMinCharge),
    provider: rakutenProviderName,
    rating: parseNumber(basicInfo.reviewAverage),
    reviewCount: parseNumber(basicInfo.reviewCount),
    sourceUpdatedAt: null,
    tags: buildTags({ basicInfo, ratingInfo }),
    thumbnailUrl: cleanText(basicInfo.hotelThumbnailUrl)
  };
}

export function normalizeRakutenHotelResponse(
  body: unknown,
  input: HotelSuggestionRequest
) {
  const parsedBody = rakutenResponseSchema.safeParse(body);

  if (!parsedBody.success) {
    throw new HotelProviderError();
  }

  return (parsedBody.data.hotels ?? [])
    .map((hotel) => normalizeHotel(hotel, input))
    .filter((hotel): hotel is HotelSuggestion => hotel !== null);
}

export function createRakutenHotelProvider(
  options: RakutenHotelProviderOptions = {}
): HotelProvider {
  const fetchImpl = options.fetch ?? fetch;

  return {
    name: rakutenProviderName,
    async searchHotels(input) {
      const config = requireRakutenConfig(options);
      const url = buildRakutenSimpleHotelSearchUrl({
        appId: config.appId,
        baseUrl: options.baseUrl,
        input
      });

      if (url === null) {
        return [];
      }

      const body = await fetchJson(fetchImpl, url, config.accessKey);

      return normalizeRakutenHotelResponse(body, input);
    }
  };
}
