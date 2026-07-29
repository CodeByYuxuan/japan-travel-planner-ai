import express from "express";
import request from "supertest";
import { describe, expect, test } from "vitest";

import { createErrorHandler } from "./errorHandler.js";
import { createRateLimitMiddleware } from "./rateLimit.js";

function createTestApp(options: { trustProxyHops?: number } = {}) {
  const app = express();

  app.set("trust proxy", options.trustProxyHops ?? 0);
  app.use(
    createRateLimitMiddleware({
      clock: () => 1_000,
      errorCode: "PROVIDER_RATE_LIMITED",
      errorMessage: "Too many provider requests. Try again later.",
      max: 1,
      windowMs: 60_000
    })
  );
  app.get("/test", (_request, response) => {
    response.sendStatus(204);
  });
  app.use(createErrorHandler());

  return app;
}

describe("rate limit middleware", () => {
  test("returns rate metadata and a configurable structured error", async () => {
    const app = createTestApp();
    const firstResponse = await request(app).get("/test");
    const secondResponse = await request(app).get("/test");

    expect(firstResponse.status).toBe(204);
    expect(firstResponse.headers["ratelimit-limit"]).toBe("1");
    expect(firstResponse.headers["ratelimit-remaining"]).toBe("0");
    expect(firstResponse.headers["ratelimit-reset"]).toBe("60");
    expect(secondResponse.status).toBe(429);
    expect(secondResponse.headers["retry-after"]).toBe("60");
    expect(secondResponse.body).toEqual({
      error: {
        code: "PROVIDER_RATE_LIMITED",
        details: {
          retryAfterSeconds: 60
        },
        message: "Too many provider requests. Try again later."
      }
    });
  });

  test("does not trust forwarded client addresses without proxy config", async () => {
    const app = createTestApp();
    const firstResponse = await request(app)
      .get("/test")
      .set("X-Forwarded-For", "198.51.100.1");
    const secondResponse = await request(app)
      .get("/test")
      .set("X-Forwarded-For", "198.51.100.2");

    expect(firstResponse.status).toBe(204);
    expect(secondResponse.status).toBe(429);
  });

  test("uses forwarded client addresses behind one configured proxy", async () => {
    const app = createTestApp({
      trustProxyHops: 1
    });
    const firstResponse = await request(app)
      .get("/test")
      .set("X-Forwarded-For", "198.51.100.1");
    const secondResponse = await request(app)
      .get("/test")
      .set("X-Forwarded-For", "198.51.100.2");

    expect(firstResponse.status).toBe(204);
    expect(secondResponse.status).toBe(204);
  });
});
