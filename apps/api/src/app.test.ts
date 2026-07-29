import request from "supertest";
import { describe, expect, test } from "vitest";

import { tripRequestSchema } from "../../../packages/shared/src/schemas/tripRequest.js";

import { createApp } from "./app.js";
import { defaultApiEnv } from "./config/env.js";

describe("API health endpoint", () => {
  test("returns an ok response", async () => {
    const response = await request(createApp({ env: defaultApiEnv })).get(
      "/api/health"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "japan-travel-planner-api"
    });
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });
});

describe("API browser origin boundary", () => {
  test("allows the configured web origin with credentials", async () => {
    const response = await request(createApp({ env: defaultApiEnv }))
      .get("/api/health")
      .set("Origin", defaultApiEnv.webOrigin);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      defaultApiEnv.webOrigin
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  test("does not emit CORS permission for an unconfigured origin", async () => {
    const response = await request(createApp({ env: defaultApiEnv }))
      .get("/api/health")
      .set("Origin", "https://untrusted.example.com");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    expect(
      response.headers["access-control-allow-credentials"]
    ).toBeUndefined();
  });
});

describe("shared schema access", () => {
  test("can validate a trip request with a shared schema", () => {
    const result = tripRequestSchema.safeParse({
      startDate: "2026-04-06",
      endDate: "2026-04-08",
      cities: ["Tokyo", "Kyoto"],
      interests: ["temples", "local food"],
      pace: "balanced",
      budget: "moderate",
      constraints: ["Avoid late-night activities"]
    });

    expect(result.success).toBe(true);
  });
});
