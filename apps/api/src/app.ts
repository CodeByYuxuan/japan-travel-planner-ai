import cors from "cors";
import express from "express";

import { loadApiEnv, type ApiEnvConfig } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { createTripsRouter } from "./routes/trips.js";
import { createTripService, type TripService } from "./services/tripService.js";

export type CreateAppOptions = {
  env?: ApiEnvConfig;
  tripService?: TripService;
};

export function createApp(options: CreateAppOptions = {}) {
  const env = options.env ?? loadApiEnv();
  const tripService = options.tripService ?? createTripService();
  const app = express();

  app.use(
    cors({
      origin: env.webOrigin
    })
  );
  app.use(express.json());
  app.use("/api/health", healthRouter);
  app.use("/api/trips", createTripsRouter(tripService));
  app.use(errorHandler);

  return app;
}
