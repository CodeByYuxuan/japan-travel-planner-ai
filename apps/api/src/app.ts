import cors from "cors";
import express, { type RequestHandler } from "express";

import { loadApiEnv, type ApiEnvConfig } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createSessionMiddleware } from "./middleware/session.js";
import { healthRouter } from "./routes/health.js";
import { createItinerariesRouter } from "./routes/itineraries.js";
import { createTripsRouter } from "./routes/trips.js";
import {
  createAiItineraryService,
  type AiItineraryService
} from "./services/aiItinerary/generateItinerary.js";
import { createTripService, type TripService } from "./services/tripService.js";

export type CreateAppOptions = {
  env?: ApiEnvConfig;
  aiItineraryService?: AiItineraryService;
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
  const aiItineraryService =
    options.aiItineraryService ?? createAiItineraryService(env);
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
  app.use("/api/itineraries", createItinerariesRouter(aiItineraryService));
  app.use("/api/trips", sessionMiddleware, createTripsRouter(tripService));
  app.use(errorHandler);

  return app;
}
