import { describe, expect, test, vi } from "vitest";

import {
  TripApiClientError,
  type TripApiClient
} from "../../lib/api/client.js";
import type { TripRecord } from "../../lib/api/types.js";
import { mockItinerary, mockTripRequest } from "../../mocks/index.js";
import {
  createShareLink,
  createSavedTrip,
  getTripErrorMessage,
  reopenSavedTrip,
  saveTrip,
  type TripOperationResult
} from "./useTrips.js";

function createTripRecord(overrides: Partial<TripRecord> = {}): TripRecord {
  return {
    id: "trip-1",
    title: mockItinerary.title,
    startDate: mockTripRequest.startDate,
    endDate: mockTripRequest.endDate,
    cities: [...mockTripRequest.cities],
    interests: [...mockTripRequest.interests],
    pace: mockTripRequest.pace,
    budget: mockTripRequest.budget,
    constraints: [...mockTripRequest.constraints],
    days: mockItinerary.days.map((day, dayIndex) => ({
      id: `day-${dayIndex + 1}`,
      ...day,
      activities: day.activities.map((activity, activityIndex) => ({
        ...activity,
        id: activity.id ?? `activity-${activityIndex + 1}`
      }))
    })),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function createMockClient(trip = createTripRecord()): TripApiClient {
  return {
    createShareLink: vi.fn(async () => ({
      token: "public-share-token-1234567890abcdef",
      permission: "read_only" as const,
      expiresAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    })),
    createTrip: vi.fn(async () => trip),
    exportSharedTripPdf: vi.fn(async () => ({
      blob: new Blob(["%PDF-1.4"]),
      contentType: "application/pdf",
      filename: "shared-trip.pdf"
    })),
    exportTripPdf: vi.fn(async () => ({
      blob: new Blob(["%PDF-1.4"]),
      contentType: "application/pdf",
      filename: "trip.pdf"
    })),
    generateItinerary: vi.fn(async () => ({
      itinerary: mockItinerary,
      metadata: {
        attempts: 1,
        estimatedCostUsd: null,
        model: "gpt-test-model",
        repaired: false,
        tokenUsage: null
      }
    })),
    getHotelSuggestions: vi.fn(async () => ({
      hotelSuggestions: [],
      status: "empty" as const
    })),
    getSharedTrip: vi.fn(async () => ({
      share: {
        token: "public-share-token-1234567890abcdef",
        permission: "read_only" as const,
        expiresAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      },
      trip
    })),
    getTrip: vi.fn(async () => trip),
    listTrips: vi.fn(async () => [trip]),
    updateTrip: vi.fn(async () => trip)
  };
}

function createGeneratedTripResult(
  overrides: {
    itineraryTitle?: string;
    firstActivityTitle?: string;
    tripId?: string;
  } = {}
) {
  const itineraryTitle =
    overrides.itineraryTitle ?? "AI Generated Tokyo And Kyoto Route";
  const firstActivityTitle =
    overrides.firstActivityTitle ?? "Generated Senso-ji morning";
  const itinerary = {
    ...mockItinerary,
    title: itineraryTitle,
    days: mockItinerary.days.map((day, dayIndex) => ({
      ...day,
      activities: day.activities.map((activity, activityIndex) => ({
        ...activity,
        id: `generated-${dayIndex + 1}-${activityIndex + 1}`,
        title:
          dayIndex === 0 && activityIndex === 0
            ? firstActivityTitle
            : activity.title
      }))
    }))
  };
  const trip = createTripRecord({
    id: overrides.tripId ?? "generated-trip-1",
    title: itinerary.title,
    days: itinerary.days.map((day, dayIndex) => ({
      id: `generated-day-${dayIndex + 1}`,
      ...day,
      activities: day.activities.map((activity) => ({
        ...activity,
        id: activity.id ?? `generated-activity-${dayIndex + 1}`
      }))
    }))
  });

  return {
    itinerary,
    trip
  };
}

describe("trip API workflow helpers", () => {
  test("creates a saved trip from the current mock itinerary draft", async () => {
    const trip = createTripRecord();
    const client = createMockClient(trip);

    const result = await createSavedTrip(
      client,
      mockTripRequest,
      mockItinerary
    );

    expect(client.createTrip).toHaveBeenCalledWith(
      expect.objectContaining({
        cities: mockTripRequest.cities,
        title: mockItinerary.title
      })
    );
    expect(result.trip).toEqual(trip);
    expect(result.request).toEqual(mockTripRequest);
    expect(result.itinerary).toMatchObject({
      title: mockItinerary.title,
      days: expect.arrayContaining([
        expect.not.objectContaining({
          id: expect.any(String)
        })
      ])
    });
  });

  test("saves existing trips with PATCH-compatible update behavior", async () => {
    const client = createMockClient();

    await saveTrip(client, {
      itinerary: mockItinerary,
      request: mockTripRequest,
      tripId: "trip-1"
    });

    expect(client.updateTrip).toHaveBeenCalledWith(
      "trip-1",
      expect.objectContaining({
        title: mockItinerary.title
      })
    );
    expect(client.createTrip).not.toHaveBeenCalled();
  });

  test("creates a trip when saving without a selected saved trip id", async () => {
    const client = createMockClient();

    await saveTrip(client, {
      itinerary: mockItinerary,
      request: mockTripRequest,
      tripId: null
    });

    expect(client.createTrip).toHaveBeenCalledOnce();
    expect(client.updateTrip).not.toHaveBeenCalled();
  });

  test("saves generated itineraries with original request metadata", async () => {
    const { itinerary, trip } = createGeneratedTripResult();
    const client = createMockClient(trip);

    const result = await saveTrip(client, {
      itinerary,
      request: mockTripRequest,
      tripId: null
    });

    expect(client.createTrip).toHaveBeenCalledWith(
      expect.objectContaining({
        budget: mockTripRequest.budget,
        cities: mockTripRequest.cities,
        constraints: mockTripRequest.constraints,
        interests: mockTripRequest.interests,
        pace: mockTripRequest.pace,
        title: "AI Generated Tokyo And Kyoto Route"
      })
    );
    expect(result.request).toEqual(mockTripRequest);
    expect(result.itinerary.title).toBe("AI Generated Tokyo And Kyoto Route");
  });

  test("saves the currently edited generated itinerary data", async () => {
    const { itinerary, trip } = createGeneratedTripResult({
      firstActivityTitle: "Edited generated Senso-ji morning"
    });
    const client = createMockClient(trip);

    await saveTrip(client, {
      itinerary,
      request: mockTripRequest,
      tripId: null
    });

    expect(client.createTrip).toHaveBeenCalledWith(
      expect.objectContaining({
        days: expect.arrayContaining([
          expect.objectContaining({
            activities: expect.arrayContaining([
              expect.objectContaining({
                title: "Edited generated Senso-ji morning"
              })
            ])
          })
        ])
      })
    );
  });

  test("reopens saved generated trips into editable itinerary state", async () => {
    const { trip } = createGeneratedTripResult({
      firstActivityTitle: "Saved generated Senso-ji morning"
    });
    const client = createMockClient(trip);

    const result: TripOperationResult = await reopenSavedTrip(
      client,
      "generated-trip-1"
    );

    expect(result.request).toEqual(mockTripRequest);
    expect(result.itinerary.title).toBe("AI Generated Tokyo And Kyoto Route");
    expect(result.itinerary.days[0]?.activities[0]).toMatchObject({
      id: "generated-1-1",
      title: "Saved generated Senso-ji morning"
    });
  });

  test("reopens saved trips through the API client", async () => {
    const trip = createTripRecord({
      title: "Reopened spring route"
    });
    const client = createMockClient(trip);

    const result = await reopenSavedTrip(client, "trip-1");

    expect(client.getTrip).toHaveBeenCalledWith("trip-1");
    expect(result.itinerary.title).toBe("Reopened spring route");
  });

  test("creates read-only share links through the API client", async () => {
    const client = createMockClient();

    const shareLink = await createShareLink(client, "trip-1");

    expect(client.createShareLink).toHaveBeenCalledWith("trip-1");
    expect(shareLink).toMatchObject({
      token: "public-share-token-1234567890abcdef",
      permission: "read_only"
    });
  });

  test("formats API field errors for visible UI feedback", () => {
    const message = getTripErrorMessage(
      new TripApiClientError({
        code: "VALIDATION_ERROR",
        fieldErrors: [
          {
            message: "Title is required.",
            path: "title"
          }
        ],
        message: "Request validation failed.",
        status: 400
      })
    );

    expect(message).toBe(
      "Request validation failed. title: Title is required."
    );
  });
});
