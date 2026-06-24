import request from "supertest";
import { describe, expect, test, vi } from "vitest";

import { apiErrorSchema } from "@japan-travel-planner/shared";

import { createApp } from "../app.js";
import { defaultApiEnv } from "../config/env.js";
import type { MapsProvider } from "../providers/maps/mapsProvider.js";

function createEnrichmentTestApp(provider: MapsProvider) {
  return createApp({
    env: defaultApiEnv,
    mapsProvider: provider
  });
}

describe("POST /api/enrichment/maps/link", () => {
  test("returns an external Google Maps search link", async () => {
    const response = await request(createApp({ env: defaultApiEnv }))
      .post("/api/enrichment/maps/link")
      .send({
        title: "Senso-ji morning visit",
        location: {
          name: "Senso-ji",
          city: "Tokyo"
        }
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      mapUrl:
        "https://www.google.com/maps/search/?api=1&query=Senso-ji%20morning%20visit%20Senso-ji%20Tokyo"
    });
  });

  test("returns null when no usable location is provided", async () => {
    const response = await request(createApp({ env: defaultApiEnv }))
      .post("/api/enrichment/maps/link")
      .send({
        title: "Only a title",
        location: {
          name: " "
        }
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      mapUrl: null
    });
  });

  test("returns structured validation errors for invalid map link input", async () => {
    const response = await request(createApp({ env: defaultApiEnv }))
      .post("/api/enrichment/maps/link")
      .send({
        location: {
          latitude: 120,
          longitude: 139.7967
        }
      });

    expect(response.status).toBe(400);
    expect(apiErrorSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Request validation failed."
    });
    expect(response.body.error.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "location.latitude"
        })
      ])
    );
  });

  test("degrades gracefully when the maps provider fails", async () => {
    const mapsProvider = {
      createSearchLink: vi.fn(() => {
        throw new Error("provider unavailable");
      })
    } satisfies MapsProvider;
    const response = await request(createEnrichmentTestApp(mapsProvider))
      .post("/api/enrichment/maps/link")
      .send({
        title: "Senso-ji morning visit",
        location: {
          name: "Senso-ji",
          city: "Tokyo"
        }
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      mapUrl: null
    });
  });
});
