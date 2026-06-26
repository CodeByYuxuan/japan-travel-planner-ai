import { Router, type RequestHandler } from "express";
import { z } from "zod";

import { ApiError } from "../errors/ApiError.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  HotelProviderConfigurationError,
  type HotelProvider
} from "../providers/hotels/hotelProvider.js";
import type { MapsProvider } from "../providers/maps/mapsProvider.js";
import {
  RouteProviderConfigurationError,
  type RouteProvider
} from "../providers/routes/routeProvider.js";
import {
  WeatherProviderConfigurationError,
  type WeatherProvider
} from "../providers/weather/weatherProvider.js";
import type { ProviderResultCache } from "../services/enrichment/cache.js";
import { createCachedHotelSuggestions } from "../services/enrichment/hotelEnrichment.js";
import { createCachedMapLink } from "../services/enrichment/mapEnrichment.js";
import { createCachedRouteHints } from "../services/enrichment/routeEnrichment.js";
import { createCachedWeatherSummary } from "../services/enrichment/weatherEnrichment.js";

const mapLinkBodySchema = z
  .object({
    title: z.string().optional(),
    location: z
      .object({
        address: z.string().optional(),
        city: z.string().optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        name: z.string().optional()
      })
      .strict()
      .optional()
  })
  .strict();

const weatherSummaryBodySchema = z
  .object({
    city: z.string().trim().min(1).optional(),
    countryCode: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/, "Expected a two-letter ISO country code.")
      .transform((countryCode) => countryCode.toUpperCase())
      .optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date."),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    units: z.enum(["metric", "imperial", "standard"]).default("metric")
  })
  .strict()
  .superRefine((body, context) => {
    const hasLatitude = body.latitude !== undefined;
    const hasLongitude = body.longitude !== undefined;

    if (hasLatitude !== hasLongitude) {
      context.addIssue({
        code: "custom",
        message: "Provide both latitude and longitude.",
        path: hasLatitude ? ["longitude"] : ["latitude"]
      });
    }

    if (!body.city && !(hasLatitude && hasLongitude)) {
      context.addIssue({
        code: "custom",
        message: "Provide either city or latitude and longitude.",
        path: ["city"]
      });
    }
  });

const hotelSuggestionsBodySchema = z
  .object({
    budget: z.enum(["budget", "moderate", "luxury"]).optional(),
    city: z.string().trim().min(1),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date."),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    maxResults: z.number().int().min(1).max(30).default(6),
    radiusKm: z.number().min(0.1).max(3).default(2),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date.")
  })
  .strict()
  .superRefine((body, context) => {
    const hasLatitude = body.latitude !== undefined;
    const hasLongitude = body.longitude !== undefined;

    if (hasLatitude !== hasLongitude) {
      context.addIssue({
        code: "custom",
        message: "Provide both latitude and longitude.",
        path: hasLatitude ? ["longitude"] : ["latitude"]
      });
    }

    if (body.startDate > body.endDate) {
      context.addIssue({
        code: "custom",
        message: "endDate must be on or after startDate.",
        path: ["endDate"]
      });
    }
  });

const routeHintLocationBodySchema = z
  .object({
    address: z.string().trim().min(1).optional(),
    label: z.string().trim().min(1),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional()
  })
  .strict()
  .superRefine((location, context) => {
    const hasLatitude = location.latitude !== undefined;
    const hasLongitude = location.longitude !== undefined;

    if (hasLatitude !== hasLongitude) {
      context.addIssue({
        code: "custom",
        message: "Provide both latitude and longitude.",
        path: hasLatitude ? ["longitude"] : ["latitude"]
      });
    }

    if (!location.address && !(hasLatitude && hasLongitude)) {
      context.addIssue({
        code: "custom",
        message: "Provide either address or latitude and longitude.",
        path: ["address"]
      });
    }
  });

const routeHintsBodySchema = z
  .object({
    city: z.string().trim().min(1).optional(),
    departureTime: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
        "Expected an ISO 8601 date-time with timezone."
      )
      .optional(),
    destination: routeHintLocationBodySchema,
    locale: z.string().trim().min(2).max(20).optional(),
    maxAlternatives: z.number().int().min(1).max(3).default(1),
    origin: routeHintLocationBodySchema,
    travelMode: z.enum(["bicycle", "drive", "transit", "walk"])
  })
  .strict();

function asyncHandler(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function createEnrichmentRouter(options: {
  hotelProvider: HotelProvider;
  mapsProvider: MapsProvider;
  providerResultCache: ProviderResultCache;
  routeProvider: RouteProvider;
  weatherProvider: WeatherProvider;
}) {
  const router = Router();

  router.post(
    "/hotels/suggestions",
    validateRequest(hotelSuggestionsBodySchema),
    asyncHandler(async (request, response) => {
      try {
        const result = await createCachedHotelSuggestions(
          request.body,
          options.hotelProvider,
          options.providerResultCache
        );

        response.status(200).json(result);
      } catch (error) {
        if (error instanceof HotelProviderConfigurationError) {
          throw new ApiError({
            code: "HOTEL_PROVIDER_CONFIGURATION_ERROR",
            message: "Hotel enrichment is not configured.",
            statusCode: 503
          });
        }

        throw error;
      }
    })
  );

  router.post(
    "/maps/link",
    validateRequest(mapLinkBodySchema),
    asyncHandler(async (request, response) => {
      response.status(200).json({
        mapUrl: await createCachedMapLink(
          request.body,
          options.mapsProvider,
          options.providerResultCache
        )
      });
    })
  );

  router.post(
    "/routes/hints",
    validateRequest(routeHintsBodySchema),
    asyncHandler(async (request, response) => {
      try {
        const result = await createCachedRouteHints(
          request.body,
          options.routeProvider,
          options.providerResultCache
        );

        response.status(200).json(result);
      } catch (error) {
        if (error instanceof RouteProviderConfigurationError) {
          throw new ApiError({
            code: "ROUTE_PROVIDER_CONFIGURATION_ERROR",
            message: "Route enrichment is not configured.",
            statusCode: 503
          });
        }

        throw error;
      }
    })
  );

  router.post(
    "/weather/summary",
    validateRequest(weatherSummaryBodySchema),
    asyncHandler(async (request, response) => {
      try {
        const result = await createCachedWeatherSummary(
          request.body,
          options.weatherProvider,
          options.providerResultCache
        );

        response.status(200).json(result);
      } catch (error) {
        if (error instanceof WeatherProviderConfigurationError) {
          throw new ApiError({
            code: "WEATHER_PROVIDER_CONFIGURATION_ERROR",
            message: "Weather enrichment is not configured.",
            statusCode: 503
          });
        }

        throw error;
      }
    })
  );

  return router;
}
