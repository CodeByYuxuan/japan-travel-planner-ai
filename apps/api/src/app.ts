import cors from "cors";
import express from "express";

import { loadApiEnv, type ApiEnvConfig } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";

export type CreateAppOptions = {
  env?: ApiEnvConfig;
};

export function createApp(options: CreateAppOptions = {}) {
  const env = options.env ?? loadApiEnv();
  const app = express();

  app.use(
    cors({
      origin: env.webOrigin
    })
  );
  app.use(express.json());
  app.use("/api/health", healthRouter);
  app.use(errorHandler);

  return app;
}
