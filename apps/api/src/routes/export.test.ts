import request from "supertest";
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
import { PdfExportService } from "../services/pdfExportService.js";
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

function expectSharedErrorResponse(responseBody: unknown) {
  expect(apiErrorSchema.safeParse(responseBody).success).toBe(true);
}

function expectPdfResponse(response: request.Response) {
  expect(response.status).toBe(200);
  expect(response.headers["content-type"]).toContain("application/pdf");
  expect(response.headers["content-disposition"]).toBe(
    'attachment; filename="tokyo-and-kyoto-spring-highlights.pdf"'
  );
  expect(response.headers["cache-control"]).toBe("no-store");

  const pdfText = response.body.toString("utf8");

  expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
  expect(pdfText).toContain("Tokyo And Kyoto Spring Highlights");
  expect(pdfText).toContain("Senso-ji and Nakamise-dori");
  expect(pdfText).toContain("Mild spring weather.");
  expect(pdfText).toContain(
    "https://www.google.com/maps/search/?api=1&query=Senso-ji%20Tokyo"
  );
  expect(pdfText).not.toContain("anonymousSessionId");
  expect(pdfText).not.toContain("userId");
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

function createExportTestApp(options: { failPdf?: boolean } = {}) {
  const tripRepository = new InMemoryTripRepository();
  const shareRepository = new InMemoryShareRepository(tripRepository);
  const shareService = new ShareService(tripRepository, shareRepository, {
    now: () => new Date("2026-01-02T00:00:00.000Z"),
    tokenFactory: () => "public-share-token-1234567890abcdef"
  });
  const pdfExportService = new PdfExportService({
    now: () => new Date("2026-01-03T04:05:06.000Z"),
    ...(options.failPdf
      ? {
          renderer: () => {
            throw new Error("PDF failure");
          }
        }
      : {})
  });

  return {
    app: createApp({
      env: defaultApiEnv,
      pdfExportService,
      shareService,
      tripService: new TripService(tripRepository)
    }),
    shareRepository
  };
}

async function createSavedTrip(options: { failPdf?: boolean } = {}) {
  const { app, shareRepository } = createExportTestApp(options);
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

describe("PDF export routes", () => {
  test("owner can export their own saved trip as a PDF", async () => {
    const { owner, trip } = await createSavedTrip();

    const response = await owner.get(`/api/trips/${trip.id}/export/pdf`);

    expectPdfResponse(response);
  });

  test("another owner cannot export someone else's private trip", async () => {
    const { app, trip } = await createSavedTrip();
    const otherTraveler = request.agent(app);

    const response = await otherTraveler.get(
      `/api/trips/${trip.id}/export/pdf`
    );

    expect(response.status).toBe(404);
    expectSharedErrorResponse(response.body);
    expect(response.body).toEqual({
      error: {
        code: "TRIP_NOT_FOUND",
        message: "Trip was not found."
      }
    });
  });

  test("valid read-only share tokens can export the shared trip PDF", async () => {
    const { app, owner, trip } = await createSavedTrip();
    const createShareResponse = await owner.post(`/api/trips/${trip.id}/share`);

    const response = await request(app).get(
      `/api/share/${createShareResponse.body.share.token}/export/pdf`
    );

    expectPdfResponse(response);
  });

  test("invalid, expired, and non-read-only share tokens cannot export PDF", async () => {
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
      const response = await request(app).get(
        `/api/share/${token}/export/pdf`
      );

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

  test("PDF generation failure returns a recoverable structured error", async () => {
    const { owner, trip } = await createSavedTrip({
      failPdf: true
    });

    const response = await owner.get(`/api/trips/${trip.id}/export/pdf`);

    expect(response.status).toBe(500);
    expectSharedErrorResponse(response.body);
    expect(response.body).toEqual({
      error: {
        code: "PDF_EXPORT_FAILED",
        message: "PDF export could not be generated."
      }
    });
  });
});
