import { describe, expect, test, vi } from "vitest";

import { TripApiClientError } from "../../lib/api/client.js";
import { mockItinerary, mockTripRequest } from "../../mocks/index.js";
import {
  createItineraryEditorState,
  itineraryEditorReducer
} from "./editing/useItineraryEditor.js";
import {
  generateTripItinerary,
  getGenerateItineraryErrorMessage
} from "./useGeneratedItinerary.js";

function createGeneratedResponse() {
  return {
    itinerary: mockItinerary,
    metadata: {
      attempts: 1,
      estimatedCostUsd: null,
      model: "gpt-test-model",
      repaired: false,
      tokenUsage: null
    }
  };
}

describe("generateTripItinerary", () => {
  test("returns a generated itinerary from the API client", async () => {
    const response = createGeneratedResponse();
    const client = {
      generateItinerary: vi.fn(async () => response)
    };

    await expect(
      generateTripItinerary(client, mockTripRequest)
    ).resolves.toEqual(response);
    expect(client.generateItinerary).toHaveBeenCalledWith(mockTripRequest);
  });

  test("can retry generation after a failure", async () => {
    const response = createGeneratedResponse();
    const client = {
      generateItinerary: vi
        .fn()
        .mockRejectedValueOnce(
          new TripApiClientError({
            code: "AI_PROVIDER_REQUEST_FAILED",
            message: "AI itinerary provider request failed.",
            status: 502
          })
        )
        .mockResolvedValueOnce(response)
    };

    await expect(
      generateTripItinerary(client, mockTripRequest)
    ).rejects.toThrow("AI itinerary provider request failed.");
    await expect(
      generateTripItinerary(client, mockTripRequest)
    ).resolves.toEqual(response);
    expect(client.generateItinerary).toHaveBeenCalledTimes(2);
  });

  test("generated itineraries remain editable after loading into editor state", async () => {
    const response = createGeneratedResponse();
    const client = {
      generateItinerary: vi.fn(async () => response)
    };
    const generated = await generateTripItinerary(client, mockTripRequest);
    const cleanState = createItineraryEditorState(generated.itinerary);
    const firstActivity = cleanState.itinerary?.days[0]?.activities[0];

    if (!firstActivity?.id) {
      throw new Error("Expected generated itinerary to receive activity ids.");
    }

    const dirtyState = itineraryEditorReducer(cleanState, {
      type: "updateActivity",
      dayDate: "2026-04-06",
      activityId: firstActivity.id,
      activity: {
        ...firstActivity,
        title: "Generated activity edited in the browser"
      }
    });

    expect(cleanState.isDirty).toBe(false);
    expect(dirtyState.isDirty).toBe(true);
    expect(dirtyState.itinerary?.days[0]?.activities[0]?.title).toBe(
      "Generated activity edited in the browser"
    );
  });
});

describe("getGenerateItineraryErrorMessage", () => {
  test("maps provider configuration errors to recoverable UI copy", () => {
    expect(
      getGenerateItineraryErrorMessage(
        new TripApiClientError({
          code: "AI_PROVIDER_CONFIGURATION_ERROR",
          message: "AI itinerary generation is not configured.",
          status: 500
        })
      )
    ).toBe(
      "AI itinerary generation is not configured on the API server. Add the server OpenAI key or use mock preview."
    );
  });

  test("maps provider failure and invalid output errors", () => {
    expect(
      getGenerateItineraryErrorMessage(
        new TripApiClientError({
          code: "AI_PROVIDER_REQUEST_FAILED",
          message: "AI itinerary provider request failed.",
          status: 502
        })
      )
    ).toBe(
      "AI itinerary generation is unavailable right now. Try again or use mock preview."
    );
    expect(
      getGenerateItineraryErrorMessage(
        new TripApiClientError({
          code: "AI_ITINERARY_INVALID_OUTPUT",
          message:
            "AI itinerary generation returned invalid structured output.",
          status: 502
        })
      )
    ).toBe(
      "AI returned an itinerary the app could not use. Try again or use mock preview."
    );
  });

  test("maps unreachable API and validation errors", () => {
    expect(
      getGenerateItineraryErrorMessage(
        new TripApiClientError({
          code: "TRIP_API_UNAVAILABLE",
          message: "Could not reach the trip API at http://localhost:3001."
        })
      )
    ).toBe(
      "Could not reach the itinerary generation API. Make sure the API server is running, then try again."
    );
    expect(
      getGenerateItineraryErrorMessage(
        new TripApiClientError({
          code: "VALIDATION_ERROR",
          fieldErrors: [
            {
              message: "Add at least one city.",
              path: "cities"
            }
          ],
          message: "Request validation failed.",
          status: 400
        })
      )
    ).toBe("Request validation failed. cities: Add at least one city.");
  });
});
