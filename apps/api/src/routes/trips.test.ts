import request from "supertest";
import { describe, expect, test } from "vitest";

import { apiErrorSchema } from "../../../../packages/shared/src/schemas/apiError.js";

import { createApp } from "../app.js";
import { defaultApiEnv } from "../config/env.js";
import type {
  CreateTripInput,
  TripOwner,
  TripRepository,
  TripResponse,
  UpdateTripInput
} from "../repositories/tripRepository.js";
import { TripService } from "../services/tripService.js";

const validCreateTripPayload = {
  title: "Tokyo And Kyoto Spring Highlights",
  startDate: "2026-04-06",
  endDate: "2026-04-08",
  cities: ["Tokyo", "Kyoto"],
  interests: ["temples", "local food"],
  pace: "balanced",
  budget: "moderate",
  constraints: ["Avoid late-night activities"],
  days: [
    {
      date: "2026-04-06",
      city: "Tokyo",
      summary: "Explore old Tokyo and classic food stops.",
      weatherSummary: "Mild spring weather.",
      activities: [
        {
          title: "Senso-ji and Nakamise-dori",
          category: "culture",
          timing: {
            startTime: "09:30",
            endTime: "11:30",
            timeOfDay: "morning"
          },
          durationMinutes: 120,
          location: {
            name: "Senso-ji",
            address: "2 Chome-3-1 Asakusa, Taito City, Tokyo",
            city: "Tokyo",
            latitude: 35.7148,
            longitude: 139.7967,
            mapUrl:
              "https://www.google.com/maps/search/?api=1&query=Senso-ji%20Tokyo"
          },
          costLevel: "free",
          notes: "Arrive early for lighter crowds."
        }
      ]
    }
  ]
} satisfies CreateTripInput;

class InMemoryTripRepository implements TripRepository {
  private readonly owner: TripOwner = { id: "test-owner" };
  private readonly tripOwners = new Map<string, string>();
  private readonly trips = new Map<string, TripResponse>();
  private nextTripId = 1;
  private nextDayId = 1;
  private nextActivityId = 1;

  async findOrCreateOwner() {
    return this.owner;
  }

  async listTrips(ownerId: string) {
    return Array.from(this.trips.values())
      .filter((trip) => this.tripOwners.get(trip.id) === ownerId)
      .map((trip) => structuredClone(trip));
  }

  async createTrip(ownerId: string, input: CreateTripInput) {
    const trip = this.tripFromInput(`trip-${this.nextTripId++}`, input);

    this.trips.set(trip.id, trip);
    this.tripOwners.set(trip.id, ownerId);

    return structuredClone(trip);
  }

  async findTrip(ownerId: string, tripId: string) {
    if (this.tripOwners.get(tripId) !== ownerId) {
      return null;
    }

    const trip = this.trips.get(tripId);

    return trip === undefined ? null : structuredClone(trip);
  }

  async updateTrip(ownerId: string, tripId: string, input: UpdateTripInput) {
    if (this.tripOwners.get(tripId) !== ownerId) {
      return null;
    }

    const existingTrip = this.trips.get(tripId);

    if (existingTrip === undefined) {
      return null;
    }

    const updatedTrip: TripResponse = {
      ...structuredClone(existingTrip),
      ...input,
      days:
        input.days === undefined
          ? structuredClone(existingTrip.days)
          : input.days.map((day) => ({
              id: `day-${this.nextDayId++}`,
              ...day,
              activities: day.activities.map((activity) => ({
                ...activity,
                id: activity.id ?? `activity-${this.nextActivityId++}`
              }))
            })),
      updatedAt: new Date("2026-01-02T00:00:00.000Z").toISOString()
    };

    this.trips.set(tripId, updatedTrip);

    return structuredClone(updatedTrip);
  }

  async deleteTrip(ownerId: string, tripId: string) {
    if (this.tripOwners.get(tripId) !== ownerId) {
      return false;
    }

    this.tripOwners.delete(tripId);
    return this.trips.delete(tripId);
  }

  private tripFromInput(id: string, input: CreateTripInput): TripResponse {
    const timestamp = new Date("2026-01-01T00:00:00.000Z").toISOString();

    return {
      id,
      ...structuredClone(input),
      days: input.days.map((day) => ({
        id: `day-${this.nextDayId++}`,
        ...day,
        activities: day.activities.map((activity) => ({
          ...activity,
          id: activity.id ?? `activity-${this.nextActivityId++}`
        }))
      })),
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }
}

function createTripsTestApp() {
  const repository = new InMemoryTripRepository();

  return createApp({
    env: defaultApiEnv,
    tripService: new TripService(repository)
  });
}

function expectSharedErrorResponse(responseBody: unknown) {
  expect(apiErrorSchema.safeParse(responseBody).success).toBe(true);
}

describe("Trip CRUD API", () => {
  test("GET /api/trips lists trips for the placeholder owner", async () => {
    const app = createTripsTestApp();

    const response = await request(app).get("/api/trips");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      trips: []
    });
  });

  test("POST /api/trips creates a trip with structured itinerary data", async () => {
    const app = createTripsTestApp();

    const response = await request(app)
      .post("/api/trips")
      .send(validCreateTripPayload);

    expect(response.status).toBe(201);
    expect(response.body.trip).toMatchObject({
      id: "trip-1",
      title: validCreateTripPayload.title,
      startDate: validCreateTripPayload.startDate,
      endDate: validCreateTripPayload.endDate,
      cities: validCreateTripPayload.cities,
      interests: validCreateTripPayload.interests,
      pace: validCreateTripPayload.pace,
      budget: validCreateTripPayload.budget,
      constraints: validCreateTripPayload.constraints
    });
    expect(response.body.trip.days).toHaveLength(1);
    expect(response.body.trip.days[0].activities[0]).toMatchObject({
      title: "Senso-ji and Nakamise-dori",
      location: {
        name: "Senso-ji"
      }
    });
  });

  test("POST /api/trips returns structured validation errors for invalid payloads", async () => {
    const app = createTripsTestApp();

    const response = await request(app).post("/api/trips").send({
      title: "",
      startDate: "2026-04-08",
      endDate: "2026-04-06",
      cities: [],
      interests: [],
      pace: "balanced",
      budget: "moderate",
      days: []
    });

    expect(response.status).toBe(400);
    expectSharedErrorResponse(response.body);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Request validation failed."
    });
    expect(response.body.error.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "title"
        }),
        expect.objectContaining({
          path: "endDate"
        })
      ])
    );
  });

  test("GET /api/trips/:tripId returns a trip", async () => {
    const app = createTripsTestApp();
    const createResponse = await request(app)
      .post("/api/trips")
      .send(validCreateTripPayload);

    const response = await request(app).get(
      `/api/trips/${createResponse.body.trip.id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.trip).toMatchObject({
      id: createResponse.body.trip.id,
      title: validCreateTripPayload.title
    });
  });

  test("GET /api/trips/:tripId returns structured 404 for missing trip IDs", async () => {
    const app = createTripsTestApp();

    const response = await request(app).get("/api/trips/missing-trip");

    expect(response.status).toBe(404);
    expectSharedErrorResponse(response.body);
    expect(response.body).toEqual({
      error: {
        code: "TRIP_NOT_FOUND",
        message: "Trip was not found."
      }
    });
  });

  test("PATCH /api/trips/:tripId updates editable trip data", async () => {
    const app = createTripsTestApp();
    const createResponse = await request(app)
      .post("/api/trips")
      .send(validCreateTripPayload);

    const response = await request(app)
      .patch(`/api/trips/${createResponse.body.trip.id}`)
      .send({
        title: "Updated Spring Trip",
        interests: ["gardens", "street food"]
      });

    expect(response.status).toBe(200);
    expect(response.body.trip).toMatchObject({
      id: createResponse.body.trip.id,
      title: "Updated Spring Trip",
      interests: ["gardens", "street food"]
    });
  });

  test("DELETE /api/trips/:tripId hard-deletes a trip", async () => {
    const app = createTripsTestApp();
    const createResponse = await request(app)
      .post("/api/trips")
      .send(validCreateTripPayload);

    const deleteResponse = await request(app).delete(
      `/api/trips/${createResponse.body.trip.id}`
    );
    const getResponse = await request(app).get(
      `/api/trips/${createResponse.body.trip.id}`
    );

    expect(deleteResponse.status).toBe(204);
    expect(getResponse.status).toBe(404);
  });

  test("GET /api/health still returns HTTP 200", async () => {
    const app = createTripsTestApp();

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "japan-travel-planner-api"
    });
  });
});
