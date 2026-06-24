import cors from "cors";
import express, { type RequestHandler } from "express";

import { loadApiEnv, type ApiEnvConfig } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createRateLimitMiddleware } from "./middleware/rateLimit.js";
import { createSessionMiddleware } from "./middleware/session.js";
import { healthRouter } from "./routes/health.js";
import { createItinerariesRouter } from "./routes/itineraries.js";
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
import { createTripService, type TripService } from "./services/tripService.js";

export type CreateAppOptions = {
  env?: ApiEnvConfig;
  aiGenerationRateLimitMiddleware?: RequestHandler;
  aiItineraryService?: AiItineraryService;
  aiUsageLogger?: AiUsageLogger;
  sessionMiddleware?: RequestHandler;
  tripService?: TripService;
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
    "/api/itineraries",
    createItinerariesRouter(aiItineraryService, {
      rateLimitMiddleware: aiGenerationRateLimitMiddleware,
      usageLogger: aiUsageLogger
    })
  );
  app.use("/api/trips", sessionMiddleware, createTripsRouter(tripService));
  app.use(errorHandler);

  return app;
}
