import { describe, expect, test, vi } from "vitest";

import { mockItinerary, mockTripRequest } from "../../mocks/index.js";
import { createTripApiClient, TripApiClientError } from "./client.js";
import type { TripRecord } from "./types.js";
import { toTripWritePayload } from "./types.js";

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

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
}

describe("createTripApiClient", () => {
  test("creates trips with included anonymous session credentials", async () => {
    const trip = createTripRecord();
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => {
        void _input;
        void _init;
        return jsonResponse({ trip });
      }
    );
    const client = createTripApiClient({
      baseUrl: "http://localhost:3001",
      fetch: fetchMock
    });
    const payload = toTripWritePayload(mockTripRequest, mockItinerary);

    const response = await client.createTrip(payload);
    const firstCall = fetchMock.mock.calls[0];

    if (!firstCall) {
      throw new Error("Expected fetch to be called");
    }

    const [url, init] = firstCall;

    expect(response).toEqual(trip);
    expect(url).toBe("http://localhost:3001/api/trips");
    expect(init).toMatchObject({
      credentials: "include",
      method: "POST"
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      title: mockItinerary.title,
      cities: mockTripRequest.cities
    });
  });

  test("lists, reopens, and updates trips through the API", async () => {
    const trip = createTripRecord();
    const responses = [
      jsonResponse({ trips: [trip] }),
      jsonResponse({ trip }),
      jsonResponse({
        trip: createTripRecord({
          title: "Updated API Trip"
        })
      })
    ];
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => {
        void _input;
        void _init;
        return (
          responses.shift() ??
          jsonResponse({
            trip
          })
        );
      }
    );
    const client = createTripApiClient({
      baseUrl: "http://localhost:3001",
      fetch: fetchMock
    });

    await expect(client.listTrips()).resolves.toEqual([trip]);
    await expect(client.getTrip("trip-1")).resolves.toEqual(trip);
    await expect(
      client.updateTrip(
        "trip-1",
        toTripWritePayload(mockTripRequest, mockItinerary)
      )
    ).resolves.toMatchObject({
      title: "Updated API Trip"
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:3001/api/trips",
      "http://localhost:3001/api/trips/trip-1",
      "http://localhost:3001/api/trips/trip-1"
    ]);
    expect(
      fetchMock.mock.calls.every(([, init]) => init?.credentials === "include")
    ).toBe(true);
  });

  test("parses structured API errors for UI display", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => {
        void _input;
        void _init;
        return jsonResponse(
          {
            error: {
              code: "VALIDATION_ERROR",
              fieldErrors: [
                {
                  message: "Title is required.",
                  path: "title"
                }
              ],
              message: "Request validation failed."
            }
          },
          {
            status: 400
          }
        );
      }
    );
    const client = createTripApiClient({
      baseUrl: "http://localhost:3001",
      fetch: fetchMock
    });

    await expect(
      client.createTrip(toTripWritePayload(mockTripRequest, mockItinerary))
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      fieldErrors: [
        {
          message: "Title is required.",
          path: "title"
        }
      ],
      message: "Request validation failed.",
      status: 400
    });
  });

  test("reports unavailable API errors without leaking fetch internals", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => {
      void _input;
      throw new TypeError("fetch failed");
    });
    const client = createTripApiClient({
      baseUrl: "http://localhost:3001",
      fetch: fetchMock
    });

    await expect(client.listTrips()).rejects.toBeInstanceOf(TripApiClientError);
    await expect(client.listTrips()).rejects.toMatchObject({
      code: "TRIP_API_UNAVAILABLE",
      message: "Could not reach the trip API at http://localhost:3001."
    });
  });
});
