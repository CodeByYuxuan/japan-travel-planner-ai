import request from "supertest";
import { describe, expect, test, vi } from "vitest";

import {
  apiErrorSchema,
  itinerarySchema,
  type TripRequest
} from "@japan-travel-planner/shared";

import { createApp } from "../app.js";
import { defaultApiEnv } from "../config/env.js";
import {
  AiItineraryService,
  type AiItineraryProvider
} from "../services/aiItinerary/generateItinerary.js";

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
    const { app, createResponse } = createItineraryTestApp([
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
  });

  test("returns validation errors for an invalid trip request", async () => {
    const { app, createResponse } = createItineraryTestApp([
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
    const response = await request(createApp({ env: defaultApiEnv }))
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
  });
});

function createItineraryTestApp(responses: Array<string | Error>) {
  const pendingResponses = [...responses];
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
    providerFactory: () => provider
  });

  return {
    app: createApp({
      aiItineraryService,
      env: defaultApiEnv
    }),
    createResponse
  };
}
