import request, { type Response } from "supertest";
import { describe, expect, test } from "vitest";

import { apiErrorSchema } from "../../../../packages/shared/src/schemas/apiError.js";

import { createApp } from "../app.js";
import { defaultApiEnv } from "../config/env.js";
import type {
  ShareLinkRecord,
  SharePermission,
  ShareRepository,
  SharedTripRecord
} from "../repositories/shareRepository.js";
import type {
  CreateTripInput,
  TripOwner,
  TripRepository,
  TripResponse,
  UpdateTripInput
} from "../repositories/tripRepository.js";
import { ShareService } from "../services/shareService.js";
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

function getSetCookieHeaders(response: Response) {
  const setCookie = response.headers["set-cookie"];

  if (Array.isArray(setCookie)) {
    return setCookie;
  }

  if (typeof setCookie === "string") {
    return [setCookie];
  }

  return [];
}

function expectSharedErrorResponse(responseBody: unknown) {
  expect(apiErrorSchema.safeParse(responseBody).success).toBe(true);
}

class InMemoryTripRepository implements TripRepository {
  private readonly owners = new Map<string, TripOwner>();
  private readonly tripOwners = new Map<string, string>();
  private readonly trips = new Map<string, TripResponse>();
  private nextOwnerId = 1;
  private nextTripId = 1;
  private nextDayId = 1;
  private nextActivityId = 1;

  async findOrCreateOwner(anonymousSessionId: string) {
    const existingOwner = this.owners.get(anonymousSessionId);

    if (existingOwner !== undefined) {
      return existingOwner;
    }

    const owner = {
      id: `owner-${this.nextOwnerId++}`
    };

    this.owners.set(anonymousSessionId, owner);

    return owner;
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

    return this.findAnyTrip(tripId);
  }

  findAnyTrip(tripId: string) {
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
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
      ...(input.cities !== undefined ? { cities: input.cities } : {}),
      ...(input.interests !== undefined ? { interests: input.interests } : {}),
      ...(input.pace !== undefined ? { pace: input.pace } : {}),
      ...(input.budget !== undefined ? { budget: input.budget } : {}),
      ...(input.constraints !== undefined
        ? { constraints: input.constraints }
        : {}),
      ...(input.days !== undefined
        ? {
            days: input.days.map((day) => ({
              id: `day-${this.nextDayId++}`,
              ...day,
              activities: day.activities.map((activity) => ({
                ...activity,
                id: activity.id ?? `activity-${this.nextActivityId++}`
              }))
            }))
          }
        : {}),
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

class InMemoryShareRepository implements ShareRepository {
  private readonly shares = new Map<string, ShareLinkRecord>();
  private nextShareId = 1;

  constructor(private readonly trips: InMemoryTripRepository) {}

  seedShare(
    options: {
      permission?: SharePermission | "write";
      token: string;
      tripId: string;
    } & Partial<Pick<ShareLinkRecord, "expiresAt">>
  ) {
    const timestamp = new Date("2026-01-01T00:00:00.000Z").toISOString();
    const share: ShareLinkRecord = {
      id: `share-${this.nextShareId++}`,
      tripId: options.tripId,
      token: options.token,
      permission:
        options.permission === undefined || options.permission === "read_only"
          ? "read_only"
          : ("write" as SharePermission),
      expiresAt: options.expiresAt ?? null,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.shares.set(share.token, share);

    return structuredClone(share);
  }

  async createReadOnlyLink(tripId: string, token: string) {
    return this.seedShare({
      token,
      tripId
    });
  }

  async findActiveReadOnlyByTripId(tripId: string, now = new Date()) {
    const share = Array.from(this.shares.values()).find(
      (candidate) =>
        candidate.tripId === tripId &&
        candidate.permission === "read_only" &&
        (candidate.expiresAt === null || new Date(candidate.expiresAt) > now)
    );

    return share === undefined ? null : structuredClone(share);
  }

  async findReadOnlyTripByToken(token: string, now = new Date()) {
    const share = this.shares.get(token);

    if (
      share === undefined ||
      share.permission !== "read_only" ||
      (share.expiresAt !== null && new Date(share.expiresAt) <= now)
    ) {
      return null;
    }

    const trip = this.trips.findAnyTrip(share.tripId);

    return trip === null
      ? null
      : ({
          share: structuredClone(share),
          trip
        } satisfies SharedTripRecord);
  }
}

function createShareTestApp() {
  const tripRepository = new InMemoryTripRepository();
  const shareRepository = new InMemoryShareRepository(tripRepository);
  const shareService = new ShareService(tripRepository, shareRepository, {
    now: () => new Date("2026-01-02T00:00:00.000Z"),
    tokenFactory: () => "public-share-token-1234567890abcdef"
  });

  return {
    app: createApp({
      env: defaultApiEnv,
      shareService,
      tripService: new TripService(tripRepository)
    }),
    shareRepository
  };
}

async function createSavedTrip() {
  const { app, shareRepository } = createShareTestApp();
  const owner = request.agent(app);
  const createResponse = await owner
    .post("/api/trips")
    .send(validCreateTripPayload);

  expect(createResponse.status).toBe(201);

  return {
    app,
    owner,
    shareRepository,
    trip: createResponse.body.trip as TripResponse
  };
}

describe("public share links", () => {
  test("owner can create and reuse a read-only share link for a saved trip", async () => {
    const { owner, trip } = await createSavedTrip();

    const createShareResponse = await owner.post(`/api/trips/${trip.id}/share`);
    const reuseShareResponse = await owner.post(`/api/trips/${trip.id}/share`);

    expect(createShareResponse.status).toBe(201);
    expect(reuseShareResponse.status).toBe(200);
    expect(createShareResponse.body).toEqual({
      share: {
        token: "public-share-token-1234567890abcdef",
        permission: "read_only",
        expiresAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    });
    expect(reuseShareResponse.body).toEqual(createShareResponse.body);
    expect(createShareResponse.body.share.token).not.toContain(trip.id);
  });

  test("another owner cannot create a share link for someone else's trip", async () => {
    const { app, trip } = await createSavedTrip();
    const otherTraveler = request.agent(app);

    const response = await otherTraveler.post(`/api/trips/${trip.id}/share`);

    expect(response.status).toBe(404);
    expectSharedErrorResponse(response.body);
    expect(response.body).toEqual({
      error: {
        code: "TRIP_NOT_FOUND",
        message: "Trip was not found."
      }
    });
  });

  test("valid share token returns read-only trip data without owner fields", async () => {
    const { app, owner, trip } = await createSavedTrip();
    const createShareResponse = await owner.post(`/api/trips/${trip.id}/share`);

    const response = await request(app).get(
      `/api/share/${createShareResponse.body.share.token}`
    );

    expect(response.status).toBe(200);
    expect(getSetCookieHeaders(response)).toEqual([]);
    expect(response.body).toMatchObject({
      share: {
        token: "public-share-token-1234567890abcdef",
        permission: "read_only",
        expiresAt: null
      },
      trip: {
        id: trip.id,
        title: validCreateTripPayload.title,
        days: [
          expect.objectContaining({
            city: "Tokyo",
            activities: [
              expect.objectContaining({
                title: "Senso-ji and Nakamise-dori",
                location: expect.objectContaining({
                  mapUrl:
                    "https://www.google.com/maps/search/?api=1&query=Senso-ji%20Tokyo"
                })
              })
            ]
          })
        ]
      }
    });
    expect(JSON.stringify(response.body)).not.toContain("anonymousSessionId");
    expect(JSON.stringify(response.body)).not.toContain("userId");
    expect(response.body.share).not.toHaveProperty("id");
    expect(response.body.share).not.toHaveProperty("tripId");
  });

  test("invalid, expired, and non-read-only tokens return safe structured errors", async () => {
    const { app, shareRepository, trip } = await createSavedTrip();

    shareRepository.seedShare({
      token: "expired-share-token-1234567890",
      tripId: trip.id,
      expiresAt: "2026-01-01T00:00:00.000Z"
    });
    shareRepository.seedShare({
      token: "write-share-token-1234567890",
      tripId: trip.id,
      permission: "write"
    });

    for (const token of [
      "not-valid",
      "expired-share-token-1234567890",
      "write-share-token-1234567890"
    ]) {
      const response = await request(app).get(`/api/share/${token}`);

      expect(response.status).toBe(404);
      expectSharedErrorResponse(response.body);
      expect(response.body).toEqual({
        error: {
          code: "SHARE_LINK_NOT_FOUND",
          message: "Share link was not found."
        }
      });
    }
  });

  test("private trip IDs and share tokens cannot bypass owner-scoped editing", async () => {
    const { app, owner, trip } = await createSavedTrip();
    const createShareResponse = await owner.post(`/api/trips/${trip.id}/share`);
    const otherTraveler = request.agent(app);

    const privateGetResponse = await otherTraveler.get(`/api/trips/${trip.id}`);
    const patchWithShareTokenResponse = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .set("Authorization", `Bearer ${createShareResponse.body.share.token}`)
      .send({
        title: "Edited Through Share Token"
      });
    const deleteWithShareTokenResponse = await request(app).delete(
      `/api/trips/${trip.id}`
    );
    const publicPatchResponse = await request(app)
      .patch(`/api/share/${createShareResponse.body.share.token}`)
      .send({
        title: "Edited Through Public Share"
      });

    expect(privateGetResponse.status).toBe(404);
    expect(patchWithShareTokenResponse.status).toBe(404);
    expect(deleteWithShareTokenResponse.status).toBe(404);
    expect(publicPatchResponse.status).toBe(404);
  });

  test("GET /api/health still returns HTTP 200", async () => {
    const { app } = createShareTestApp();

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok"
    });
  });
});
