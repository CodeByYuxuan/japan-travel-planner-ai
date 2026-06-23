import { describe, expect, test, vi } from "vitest";

import {
  TripApiClientError,
  type TripApiClient
} from "../../lib/api/client.js";
import type { TripRecord } from "../../lib/api/types.js";
import { mockItinerary, mockTripRequest } from "../../mocks/index.js";
import {
  createSavedTrip,
  getTripErrorMessage,
  reopenSavedTrip,
  saveTrip
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
    createTrip: vi.fn(async () => trip),
    getTrip: vi.fn(async () => trip),
    listTrips: vi.fn(async () => [trip]),
    updateTrip: vi.fn(async () => trip)
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

  test("reopens saved trips through the API client", async () => {
    const trip = createTripRecord({
      title: "Reopened spring route"
    });
    const client = createMockClient(trip);

    const result = await reopenSavedTrip(client, "trip-1");

    expect(client.getTrip).toHaveBeenCalledWith("trip-1");
    expect(result.itinerary.title).toBe("Reopened spring route");
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
