import { Router, type RequestHandler } from "express";
import { z } from "zod";

import { ApiError } from "../errors/ApiError.js";
import { validateRequest } from "../middleware/validateRequest.js";
import type { MapsProvider } from "../providers/maps/mapsProvider.js";
import {
  WeatherProviderConfigurationError,
  type WeatherProvider
} from "../providers/weather/weatherProvider.js";
import type { ProviderResultCache } from "../services/enrichment/cache.js";
import { createCachedMapLink } from "../services/enrichment/mapEnrichment.js";
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

function asyncHandler(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function createEnrichmentRouter(options: {
  mapsProvider: MapsProvider;
  providerResultCache: ProviderResultCache;
  weatherProvider: WeatherProvider;
}) {
  const router = Router();

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
