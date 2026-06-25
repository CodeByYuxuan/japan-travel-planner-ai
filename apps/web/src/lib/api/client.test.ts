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

function pdfResponse(init: ResponseInit = {}) {
  return new Response(new Blob(["%PDF-1.4\nTest PDF"]), {
    headers: {
      "Content-Disposition": 'attachment; filename="test-itinerary.pdf"',
      "Content-Type": "application/pdf"
    },
    ...init
  });
}

function hotelSuggestionsResponse(init: ResponseInit = {}) {
  return jsonResponse(
    {
      hotelSuggestions: [
        {
          access: "3 minutes from Tokyo Station",
          address: "1 Marunouchi, Chiyoda City, Tokyo",
          amenities: ["Wi-Fi"],
          bookingUrl: "https://example.com/hotel",
          city: "Tokyo",
          currency: "JPY",
          description: "Central hotel for rail-friendly days.",
          id: "rakuten-travel:123456",
          imageUrl: "https://example.com/hotel.jpg",
          latitude: 35.6812,
          longitude: 139.7671,
          mapUrl: "https://www.google.com/maps/search/?api=1&query=Tokyo",
          name: "Tokyo Station Stay",
          priceFrom: 18000,
          provider: "rakuten-travel",
          rating: 4.5,
          reviewCount: 321,
          sourceUpdatedAt: null,
          tags: ["Near Tokyo Station"],
          thumbnailUrl: "https://example.com/thumb.jpg"
        }
      ],
      status: "available"
    },
    init
  );
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
      }),
      jsonResponse({
        share: {
          token: "public-share-token-1234567890abcdef",
          permission: "read_only",
          expiresAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      }),
      jsonResponse({
        share: {
          token: "public-share-token-1234567890abcdef",
          permission: "read_only",
          expiresAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        },
        trip
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
    await expect(client.createShareLink("trip-1")).resolves.toMatchObject({
      token: "public-share-token-1234567890abcdef",
      permission: "read_only"
    });
    await expect(
      client.getSharedTrip("public-share-token-1234567890abcdef")
    ).resolves.toMatchObject({
      share: {
        permission: "read_only"
      },
      trip: {
        id: "trip-1"
      }
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:3001/api/trips",
      "http://localhost:3001/api/trips/trip-1",
      "http://localhost:3001/api/trips/trip-1",
      "http://localhost:3001/api/trips/trip-1/share",
      "http://localhost:3001/api/share/public-share-token-1234567890abcdef"
    ]);
    expect(
      fetchMock.mock.calls.map(([, init]) => init?.method ?? "GET")
    ).toEqual(["GET", "GET", "PATCH", "POST", "GET"]);
    expect(
      fetchMock.mock.calls.every(([, init]) => init?.credentials === "include")
    ).toBe(true);
  });

  test("generates itineraries with included anonymous session credentials", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => {
        void _input;
        void _init;
        return jsonResponse({
          itinerary: mockItinerary,
          metadata: {
            attempts: 1,
            estimatedCostUsd: null,
            model: "gpt-test-model",
            repaired: false,
            tokenUsage: null
          }
        });
      }
    );
    const client = createTripApiClient({
      baseUrl: "http://localhost:3001",
      fetch: fetchMock
    });

    const response = await client.generateItinerary(mockTripRequest);
    const firstCall = fetchMock.mock.calls[0];

    if (!firstCall) {
      throw new Error("Expected fetch to be called");
    }

    const [url, init] = firstCall;

    expect(response).toEqual({
      itinerary: mockItinerary,
      metadata: {
        attempts: 1,
        estimatedCostUsd: null,
        model: "gpt-test-model",
        repaired: false,
        tokenUsage: null
      }
    });
    expect(url).toBe("http://localhost:3001/api/itineraries/generate");
    expect(init).toMatchObject({
      credentials: "include",
      method: "POST"
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      cities: mockTripRequest.cities,
      interests: mockTripRequest.interests
    });
  });

  test("exports private and shared trip PDFs through the API", async () => {
    const responses = [pdfResponse(), pdfResponse()];
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => {
        void _input;
        void _init;
        return responses.shift() ?? pdfResponse();
      }
    );
    const client = createTripApiClient({
      baseUrl: "http://localhost:3001",
      fetch: fetchMock
    });

    await expect(client.exportTripPdf("trip-1")).resolves.toMatchObject({
      contentType: "application/pdf",
      filename: "test-itinerary.pdf"
    });
    await expect(
      client.exportSharedTripPdf("public-share-token-1234567890abcdef")
    ).resolves.toMatchObject({
      contentType: "application/pdf",
      filename: "test-itinerary.pdf"
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:3001/api/trips/trip-1/export/pdf",
      "http://localhost:3001/api/share/public-share-token-1234567890abcdef/export/pdf"
    ]);
    expect(
      fetchMock.mock.calls.every(([, init]) => init?.credentials === "include")
    ).toBe(true);
    expect(
      fetchMock.mock.calls.every(([, init]) =>
        new Headers(init?.headers).get("Accept")?.includes("application/pdf")
      )
    ).toBe(true);
  });

  test("requests normalized hotel suggestions through the API", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => {
        void _input;
        void _init;
        return hotelSuggestionsResponse();
      }
    );
    const client = createTripApiClient({
      baseUrl: "http://localhost:3001",
      fetch: fetchMock
    });

    await expect(
      client.getHotelSuggestions({
        budget: "moderate",
        city: "Tokyo",
        endDate: "2026-04-08",
        startDate: "2026-04-06"
      })
    ).resolves.toMatchObject({
      hotelSuggestions: [
        {
          id: "rakuten-travel:123456",
          name: "Tokyo Station Stay",
          provider: "rakuten-travel"
        }
      ],
      status: "available"
    });

    const firstCall = fetchMock.mock.calls[0];

    if (!firstCall) {
      throw new Error("Expected fetch to be called");
    }

    const [url, init] = firstCall;

    expect(url).toBe("http://localhost:3001/api/enrichment/hotels/suggestions");
    expect(init).toMatchObject({
      credentials: "include",
      method: "POST"
    });
    expect(new Headers(init?.headers).get("Accept")).toContain(
      "application/json"
    );
    expect(JSON.parse(String(init?.body))).toMatchObject({
      budget: "moderate",
      city: "Tokyo"
    });
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

  test("parses structured generation API errors for UI display", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => {
        void _input;
        void _init;
        return jsonResponse(
          {
            error: {
              code: "AI_PROVIDER_CONFIGURATION_ERROR",
              details: {
                reason: "PROVIDER_CONFIGURATION"
              },
              message: "AI itinerary generation is not configured."
            }
          },
          {
            status: 500
          }
        );
      }
    );
    const client = createTripApiClient({
      baseUrl: "http://localhost:3001",
      fetch: fetchMock
    });

    await expect(
      client.generateItinerary(mockTripRequest)
    ).rejects.toMatchObject({
      code: "AI_PROVIDER_CONFIGURATION_ERROR",
      details: {
        reason: "PROVIDER_CONFIGURATION"
      },
      message: "AI itinerary generation is not configured.",
      status: 500
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
