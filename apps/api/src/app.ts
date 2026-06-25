import cors from "cors";
import express, { type RequestHandler } from "express";

import { loadApiEnv, type ApiEnvConfig } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createRateLimitMiddleware } from "./middleware/rateLimit.js";
import { createSessionMiddleware } from "./middleware/session.js";
import {
  createGoogleMapsProvider,
  type MapsProvider
} from "./providers/maps/mapsProvider.js";
import {
  createOpenWeatherProvider,
  type WeatherProvider
} from "./providers/weather/weatherProvider.js";
import { createEnrichmentRouter } from "./routes/enrichment.js";
import { healthRouter } from "./routes/health.js";
import { createItinerariesRouter } from "./routes/itineraries.js";
import { createShareRouter } from "./routes/share.js";
import { createTripsRouter } from "./routes/trips.js";
import {
  createAiItineraryService,
  type AiItineraryService
} from "./services/aiItinerary/generateItinerary.js";
import {
  createConsoleAiUsageLogger,
  recordAiUsageSafely,
  type AiUsageLogger
} from "./services/aiItinerary/usageLogger.js";
import {
  createProviderResultCache,
  type ProviderResultCache
} from "./services/enrichment/cache.js";
import { createShareService, type ShareService } from "./services/shareService.js";
import { createTripService, type TripService } from "./services/tripService.js";

export type CreateAppOptions = {
  env?: ApiEnvConfig;
  aiGenerationRateLimitMiddleware?: RequestHandler;
  aiItineraryService?: AiItineraryService;
  aiUsageLogger?: AiUsageLogger;
  mapsProvider?: MapsProvider;
  providerResultCache?: ProviderResultCache;
  sessionMiddleware?: RequestHandler;
  shareService?: ShareService;
  tripService?: TripService;
  weatherProvider?: WeatherProvider;
};

export function createApp(options: CreateAppOptions = {}) {
  const env = options.env ?? loadApiEnv();
  const sessionMiddleware =
    options.sessionMiddleware ??
    createSessionMiddleware({
      secret: env.jwtSecret
    });
  const aiUsageLogger = options.aiUsageLogger ?? createConsoleAiUsageLogger();
  const aiItineraryService =
    options.aiItineraryService ??
    createAiItineraryService(env, {
      usageLogger: aiUsageLogger
    });
  const aiGenerationRateLimitMiddleware =
    options.aiGenerationRateLimitMiddleware ??
    createRateLimitMiddleware({
      max: env.aiGenerationRateLimitMax,
      onRateLimited: ({ identifier }) => {
        void recordAiUsageSafely(aiUsageLogger, {
          attempts: 0,
          estimatedCostUsd: null,
          model: null,
          outcome: "rate_limited",
          requestIdentifier: identifier,
          tokenUsage: null
        });
      },
      windowMs: env.aiGenerationRateLimitWindowMs
    });
  const tripService = options.tripService ?? createTripService();
  const shareService = options.shareService ?? createShareService();
  const mapsProvider = options.mapsProvider ?? createGoogleMapsProvider();
  const providerResultCache =
    options.providerResultCache ?? createProviderResultCache();
  const weatherProvider =
    options.weatherProvider ??
    createOpenWeatherProvider({
      apiKey: env.weatherApiKey
    });
  const app = express();

  app.use(
    cors({
      credentials: true,
      origin: env.webOrigin
    })
  );
  app.use(express.json());
  app.use("/api/health", healthRouter);
  app.use(
    "/api/enrichment",
    createEnrichmentRouter({
      mapsProvider,
      providerResultCache,
      weatherProvider
    })
  );
  app.use(
    "/api/itineraries",
    createItinerariesRouter(aiItineraryService, {
      rateLimitMiddleware: aiGenerationRateLimitMiddleware,
      usageLogger: aiUsageLogger
    })
  );
  app.use("/api/share", createShareRouter(shareService));
  app.use(
    "/api/trips",
    sessionMiddleware,
    createTripsRouter(tripService, shareService)
  );
  app.use(errorHandler);

  return app;
}
