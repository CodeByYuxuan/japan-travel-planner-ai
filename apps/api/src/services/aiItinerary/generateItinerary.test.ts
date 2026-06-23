import { describe, expect, test, vi } from "vitest";

import {
  itinerarySchema,
  type TripRequest
} from "@japan-travel-planner/shared";

import { defaultApiEnv } from "../../config/env.js";
import { ApiError } from "../../errors/ApiError.js";
import {
  AiItineraryService,
  createAiItineraryService,
  type AiItineraryProvider
} from "./generateItinerary.js";

const representativeTripRequest = {
  startDate: "2026-04-06",
  endDate: "2026-04-07",
  cities: ["Tokyo", "Kyoto"],
  interests: ["temples", "local food"],
  pace: "balanced",
  budget: "moderate",
  constraints: ["Vegetarian meals only"]
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
      summary: "Start with classic temple streets and local food.",
      activities: [
        {
          title: "Senso-ji and Nakamise-dori",
          category: "temple",
          timing: {
            startTime: "09:30",
            endTime: "11:30",
            timeOfDay: "morning"
          },
          durationMinutes: "120 minutes",
          location: {
            name: "Senso-ji",
            city: "Tokyo"
          },
          costLevel: "free",
          notes: "Arrive early and keep time flexible around the market street."
        }
      ]
    },
    {
      dayNumber: 2,
      date: "2026-04-07",
      city: "Kyoto",
      summary: "Transfer to Kyoto and keep the afternoon focused.",
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
          notes: "Treat train timing as approximate and leave transfer buffer."
        }
      ]
    }
  ]
};

describe("AiItineraryService", () => {
  test("returns a validated itinerary for valid model output", async () => {
    const { createResponse, service } = createTestService([
      JSON.stringify(validModelOutput)
    ]);

    const result = await service.generateItinerary(representativeTripRequest);

    expect(itinerarySchema.safeParse(result.itinerary).success).toBe(true);
    expect(result).toMatchObject({
      metadata: {
        attempts: 1,
        estimatedCostUsd: null,
        model: "gpt-test-model",
        repaired: false,
        tokenUsage: null
      }
    });
    expect(result.itinerary.days[0]?.activities[0]).toMatchObject({
      category: "culture",
      durationMinutes: 120
    });
    expect(createResponse).toHaveBeenCalledTimes(1);
    expect(createResponse.mock.calls[0]?.[0].input).toContain(
      "Dates: 2026-04-06 to 2026-04-07"
    );
  });

  test("repairs invalid first output once and returns the repaired itinerary", async () => {
    const { createResponse, service } = createTestService([
      "not valid json",
      JSON.stringify(validModelOutput)
    ]);

    const result = await service.generateItinerary(representativeTripRequest);

    expect(itinerarySchema.safeParse(result.itinerary).success).toBe(true);
    expect(result.metadata).toMatchObject({
      attempts: 2,
      model: "gpt-test-model",
      repaired: true
    });
    expect(createResponse).toHaveBeenCalledTimes(2);
    expect(createResponse.mock.calls[1]?.[0].input).toContain(
      "Validation errors:"
    );
    expect(createResponse.mock.calls[1]?.[0].input).toContain("modelOutput");
    expect(createResponse.mock.calls[1]?.[0].instructions).toContain(
      "Return corrected structured JSON only"
    );
  });

  test("returns a structured generation failure after invalid output and invalid repair", async () => {
    const { createResponse, service } = createTestService([
      "not valid json",
      JSON.stringify({
        ...validModelOutput,
        days: []
      })
    ]);

    await expect(
      service.generateItinerary(representativeTripRequest)
    ).rejects.toMatchObject({
      code: "AI_ITINERARY_INVALID_OUTPUT",
      details: {
        attempts: 2,
        reason: "MODEL_OUTPUT_INVALID"
      },
      message: "AI itinerary generation returned invalid structured output.",
      statusCode: 502
    } satisfies Partial<ApiError>);
    expect(createResponse).toHaveBeenCalledTimes(2);
  });

  test("maps provider failures to a safe structured error", async () => {
    const { service } = createTestService([
      new Error("secret provider detail")
    ]);

    await expect(
      service.generateItinerary(representativeTripRequest)
    ).rejects.toMatchObject({
      code: "AI_PROVIDER_REQUEST_FAILED",
      details: {
        reason: "PROVIDER_FAILURE"
      },
      message: "AI itinerary provider request failed.",
      statusCode: 502
    } satisfies Partial<ApiError>);
  });

  test("fails clearly when generation is invoked without OPENAI_API_KEY", async () => {
    const service = createAiItineraryService(defaultApiEnv);

    await expect(
      service.generateItinerary(representativeTripRequest)
    ).rejects.toMatchObject({
      code: "AI_PROVIDER_CONFIGURATION_ERROR",
      details: {
        reason: "PROVIDER_CONFIGURATION"
      },
      message: "AI itinerary generation is not configured.",
      statusCode: 500
    } satisfies Partial<ApiError>);
  });
});

function createTestService(responses: Array<string | Error>): {
  createResponse: ReturnType<
    typeof vi.fn<AiItineraryProvider["createResponse"]>
  >;
  service: AiItineraryService;
} {
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

  return {
    createResponse,
    service: new AiItineraryService({
      providerFactory: () => provider
    })
  };
}
