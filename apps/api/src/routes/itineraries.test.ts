import request from "supertest";
import { describe, expect, test, vi } from "vitest";

import {
  apiErrorSchema,
  itinerarySchema,
  type TripRequest
} from "@japan-travel-planner/shared";

import { createApp } from "../app.js";
import { defaultApiEnv, type ApiEnvConfig } from "../config/env.js";
import {
  AiItineraryService,
  type AiItineraryProvider
} from "../services/aiItinerary/generateItinerary.js";
import {
  createConsoleAiUsageLogger,
  type AiUsageLogEntry
} from "../services/aiItinerary/usageLogger.js";
import type { TripRepository } from "../repositories/tripRepository.js";
import { TripService } from "../services/tripService.js";

const validTripRequest = {
  startDate: "2026-04-06",
  endDate: "2026-04-07",
  cities: ["Tokyo", "Kyoto"],
  interests: ["temples", "local food"],
  pace: "balanced",
  budget: "moderate",
  constraints: ["Avoid late-night activities"]
} satisfies TripRequest;

const validModelOutput = {
  title: "Tokyo And Kyoto Highlights",
  startDate: "2026-04-06",
  endDate: "2026-04-07",
  days: [
    {
      dayNumber: 1,
      date: "2026-04-06",
      city: "Tokyo",
      summary: "Classic Tokyo temple streets and local food.",
      activities: [
        {
          title: "Senso-ji and Nakamise-dori",
          category: "temple",
          timing: {
            startTime: "09:30",
            endTime: "11:30",
            timeOfDay: "morning"
          },
          durationMinutes: 120,
          location: {
            name: "Senso-ji",
            city: "Tokyo"
          },
          costLevel: "free",
          notes: "Arrive early and keep time flexible."
        }
      ]
    },
    {
      dayNumber: 2,
      date: "2026-04-07",
      city: "Kyoto",
      summary: "Transfer to Kyoto and visit one focused district.",
      activities: [
        {
          title: "Tokaido Shinkansen to Kyoto",
          category: "transport",
          timing: {
            startTime: "08:30",
            endTime: "10:50",
            timeOfDay: "morning"
          },
          durationMinutes: 140,
          location: {
            name: "Tokyo Station to Kyoto Station",
            city: "Tokyo"
          },
          costLevel: "expensive",
          notes: "Keep train timing approximate and leave transfer buffer."
        }
      ]
    }
  ]
};

describe("POST /api/itineraries/generate", () => {
  test("returns a validated itinerary for a valid request with mocked AI success", async () => {
    const { app, createResponse, usageEntries } = createItineraryTestApp([
      JSON.stringify(validModelOutput)
    ]);

    const response = await request(app)
      .post("/api/itineraries/generate")
      .send(validTripRequest);

    expect(response.status).toBe(200);
    expect(itinerarySchema.safeParse(response.body.itinerary).success).toBe(
      true
    );
    expect(response.body.metadata).toEqual({
      attempts: 1,
      estimatedCostUsd: null,
      model: "gpt-test-model",
      repaired: false,
      tokenUsage: null
    });
    expect(response.body.itinerary.days[0].activities[0]).toMatchObject({
      category: "culture",
      costLevel: "free"
    });
    expect(createResponse).toHaveBeenCalledTimes(1);
    expect(usageEntries).toEqual([
      expect.objectContaining({
        attempts: 1,
        estimatedCostUsd: null,
        model: "gpt-test-model",
        outcome: "success",
        tokenUsage: null
      })
    ]);
    expect(JSON.stringify(usageEntries[0])).not.toContain(
      "Avoid late-night activities"
    );
  });

  test("returns validation errors for an invalid trip request", async () => {
    const { app, createResponse, usageEntries } = createItineraryTestApp([
      JSON.stringify(validModelOutput)
    ]);

    const response = await request(app)
      .post("/api/itineraries/generate")
      .send({
        ...validTripRequest,
        cities: [],
        endDate: "2026-04-01"
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
          path: "cities"
        }),
        expect.objectContaining({
          path: "endDate"
        })
      ])
    );
    expect(createResponse).not.toHaveBeenCalled();
    expect(usageEntries).toEqual([
      expect.objectContaining({
        attempts: 0,
        model: null,
        outcome: "validation_error",
        tokenUsage: null
      })
    ]);
  });

  test("returns a structured error when model output remains invalid after repair", async () => {
    const { app, createResponse } = createItineraryTestApp([
      "not valid json",
      JSON.stringify({
        ...validModelOutput,
        days: []
      })
    ]);

    const response = await request(app)
      .post("/api/itineraries/generate")
      .send(validTripRequest);

    expect(response.status).toBe(502);
    expect(apiErrorSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.error).toEqual({
      code: "AI_ITINERARY_INVALID_OUTPUT",
      details: {
        attempts: 2,
        reason: "MODEL_OUTPUT_INVALID"
      },
      message: "AI itinerary generation returned invalid structured output."
    });
    expect(createResponse).toHaveBeenCalledTimes(2);
  });

  test("returns a structured missing-key error when generation is invoked without OpenAI config", async () => {
    const usageEntries: AiUsageLogEntry[] = [];
    const usageLogger = createConsoleAiUsageLogger({
      sink: (entry) => usageEntries.push(entry)
    });
    const response = await request(
      createApp({
        aiUsageLogger: usageLogger,
        env: defaultApiEnv
      })
    )
      .post("/api/itineraries/generate")
      .send(validTripRequest);

    expect(response.status).toBe(500);
    expect(apiErrorSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.error).toEqual({
      code: "AI_PROVIDER_CONFIGURATION_ERROR",
      details: {
        reason: "PROVIDER_CONFIGURATION"
      },
      message: "AI itinerary generation is not configured."
    });
    expect(usageEntries).toEqual([
      expect.objectContaining({
        attempts: 0,
        model: null,
        outcome: "provider_configuration_error"
      })
    ]);
  });

  test("rate limits generation with a structured API error", async () => {
    const { app, createResponse, usageEntries } = createItineraryTestApp(
      [JSON.stringify(validModelOutput)],
      {
        env: {
          ...defaultApiEnv,
          aiGenerationRateLimitMax: 1,
          aiGenerationRateLimitWindowMs: 60_000
        }
      }
    );

    const firstResponse = await request(app)
      .post("/api/itineraries/generate")
      .send(validTripRequest);
    const secondResponse = await request(app)
      .post("/api/itineraries/generate")
      .send(validTripRequest);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(secondResponse.headers["retry-after"]).toBe("60");
    expect(apiErrorSchema.safeParse(secondResponse.body).success).toBe(true);
    expect(secondResponse.body).toEqual({
      error: {
        code: "RATE_LIMITED",
        details: {
          retryAfterSeconds: 60
        },
        message: "Too many itinerary generation requests. Try again later."
      }
    });
    expect(createResponse).toHaveBeenCalledTimes(1);
    expect(usageEntries).toEqual([
      expect.objectContaining({
        outcome: "success"
      }),
      expect.objectContaining({
        attempts: 0,
        model: null,
        outcome: "rate_limited",
        tokenUsage: null
      })
    ]);
  });

  test("generation rate limit does not affect health or Trip CRUD routes", async () => {
    const { app } = createItineraryTestApp([JSON.stringify(validModelOutput)], {
      env: {
        ...defaultApiEnv,
        aiGenerationRateLimitMax: 1,
        aiGenerationRateLimitWindowMs: 60_000
      },
      tripService: createEmptyTripService()
    });

    await request(app).post("/api/itineraries/generate").send(validTripRequest);
    await request(app).post("/api/itineraries/generate").send(validTripRequest);

    const healthResponse = await request(app).get("/api/health");
    const tripListResponse = await request(app).get("/api/trips");

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body).toEqual({
      service: "japan-travel-planner-api",
      status: "ok"
    });
    expect(tripListResponse.status).toBe(200);
    expect(tripListResponse.body).toEqual({
      trips: []
    });
  });
});

function createItineraryTestApp(
  responses: Array<string | Error>,
  options: {
    env?: ApiEnvConfig | undefined;
    tripService?: TripService | undefined;
  } = {}
) {
  const pendingResponses = [...responses];
  const usageEntries: AiUsageLogEntry[] = [];
  const usageLogger = createConsoleAiUsageLogger({
    clock: () => new Date("2026-01-01T00:00:00.000Z"),
    sink: (entry) => usageEntries.push(entry)
  });
  const createResponse = vi.fn<AiItineraryProvider["createResponse"]>(
    async () => {
      const response = pendingResponses.shift();

      if (response instanceof Error) {
        throw response;
      }

      if (response === undefined) {
        throw new Error("No fake AI response configured.");
      }

      return {
        model: "gpt-test-model",
        text: response
      };
    }
  );
  const provider = {
    createResponse
  } satisfies AiItineraryProvider;
  const aiItineraryService = new AiItineraryService({
    providerFactory: () => provider,
    usageLogger
  });

  return {
    app: createApp({
      aiItineraryService,
      aiUsageLogger: usageLogger,
      env: options.env ?? defaultApiEnv,
      ...(options.tripService !== undefined
        ? { tripService: options.tripService }
        : {})
    }),
    createResponse,
    usageEntries
  };
}

function createEmptyTripService() {
  const repository = {
    createTrip: async () => {
      throw new Error("createTrip should not be called in this test.");
    },
    deleteTrip: async () => false,
    findOrCreateOwner: async () => ({
      id: "owner-1"
    }),
    findTrip: async () => null,
    listTrips: async () => [],
    updateTrip: async () => null
  } satisfies TripRepository;

  return new TripService(repository);
}
