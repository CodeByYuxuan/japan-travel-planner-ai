import { describe, expect, test, vi } from "vitest";

import { ApiError } from "../errors/ApiError.js";
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

import { createShareToken, ShareService } from "./shareService.js";

const trip: TripResponse = {
  id: "trip-1",
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
      id: "day-1",
      date: "2026-04-06",
      city: "Tokyo",
      activities: [
        {
          id: "activity-1",
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
            city: "Tokyo"
          },
          costLevel: "free",
          notes: "Arrive early for lighter crowds."
        }
      ]
    }
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

class InMemoryTripRepository implements TripRepository {
  private readonly owners = new Map<string, TripOwner>();
  private readonly tripOwners = new Map<string, string>();
  private readonly trips = new Map<string, TripResponse>();

  setTrip(ownerSessionId: string, nextTrip: TripResponse) {
    const owner = {
      id: `owner-${ownerSessionId}`
    };

    this.owners.set(ownerSessionId, owner);
    this.trips.set(nextTrip.id, structuredClone(nextTrip));
    this.tripOwners.set(nextTrip.id, owner.id);
  }

  async findOrCreateOwner(anonymousSessionId: string) {
    const existingOwner = this.owners.get(anonymousSessionId);

    if (existingOwner !== undefined) {
      return existingOwner;
    }

    const owner = {
      id: `owner-${anonymousSessionId}`
    };

    this.owners.set(anonymousSessionId, owner);

    return owner;
  }

  async listTrips(ownerId: string) {
    return Array.from(this.trips.values()).filter(
      (candidate) => this.tripOwners.get(candidate.id) === ownerId
    );
  }

  async createTrip(
    ownerId: string,
    input: CreateTripInput
  ): Promise<TripResponse> {
    void ownerId;
    void input;
    throw new Error("createTrip is not used by share service tests.");
  }

  async findTrip(ownerId: string, tripId: string) {
    if (this.tripOwners.get(tripId) !== ownerId) {
      return null;
    }

    const existingTrip = this.trips.get(tripId);

    return existingTrip === undefined ? null : structuredClone(existingTrip);
  }

  async updateTrip(
    ownerId: string,
    tripId: string,
    input: UpdateTripInput
  ): Promise<TripResponse | null> {
    void ownerId;
    void tripId;
    void input;
    throw new Error("updateTrip is not used by share service tests.");
  }

  async deleteTrip(ownerId: string, tripId: string): Promise<boolean> {
    void ownerId;
    void tripId;
    throw new Error("deleteTrip is not used by share service tests.");
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
        options.permission === "read_only" || options.permission === undefined
          ? "read_only"
          : ("write" as SharePermission),
      expiresAt: options.expiresAt ?? null,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.shares.set(share.token, share);

    return share;
  }

  async createReadOnlyLink(tripId: string, token: string) {
    return this.seedShare({
      token,
      tripId
    });
  }

  async findActiveReadOnlyByTripId(tripId: string, now = new Date()) {
    return (
      Array.from(this.shares.values()).find(
        (share) =>
          share.tripId === tripId &&
          share.permission === "read_only" &&
          (share.expiresAt === null || new Date(share.expiresAt) > now)
      ) ?? null
    );
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

    const sharedTrip = await this.trips.findTrip(
      `owner-owner-session`,
      share.tripId
    );

    if (sharedTrip === null) {
      return null;
    }

    return {
      share,
      trip: sharedTrip
    } satisfies SharedTripRecord;
  }
}

function createTestService(options: {
  tokenFactory?: () => string;
} = {}) {
  const tripRepository = new InMemoryTripRepository();
  const shareRepository = new InMemoryShareRepository(tripRepository);

  tripRepository.setTrip("owner-session", trip);

  return {
    service: new ShareService(tripRepository, shareRepository, {
      now: () => new Date("2026-01-02T00:00:00.000Z"),
      tokenFactory: options.tokenFactory ?? (() => "share-token-1234567890")
    }),
    shareRepository,
    tripRepository
  };
}

describe("createShareToken", () => {
  test("creates high-entropy URL-safe tokens that are not trip-derived", () => {
    const firstToken = createShareToken();
    const secondToken = createShareToken();

    expect(firstToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(secondToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(firstToken).not.toBe(secondToken);
    expect(firstToken).not.toContain("trip-1");
  });
});

describe("ShareService", () => {
  test("creates a read-only share link for the trip owner", async () => {
    const { service } = createTestService({
      tokenFactory: () => "share-token-1234567890abcdef"
    });

    const result = await service.createShareLink("owner-session", "trip-1");

    expect(result).toEqual({
      reused: false,
      share: expect.objectContaining({
        token: "share-token-1234567890abcdef",
        permission: "read_only",
        expiresAt: null
      })
    });
    expect(result.share).not.toHaveProperty("id");
    expect(result.share).not.toHaveProperty("tripId");
  });

  test("reuses an existing active read-only link for the same trip", async () => {
    const tokenFactory = vi.fn(() => "new-token-should-not-be-used");
    const { service, shareRepository } = createTestService({
      tokenFactory
    });

    shareRepository.seedShare({
      token: "existing-share-token-1234567890",
      tripId: "trip-1"
    });

    const result = await service.createShareLink("owner-session", "trip-1");

    expect(result.reused).toBe(true);
    expect(result.share.token).toBe("existing-share-token-1234567890");
    expect(tokenFactory).not.toHaveBeenCalled();
  });

  test("does not let another owner create a share link", async () => {
    const { service } = createTestService();

    await expect(
      service.createShareLink("different-session", "trip-1")
    ).rejects.toMatchObject({
      code: "TRIP_NOT_FOUND",
      statusCode: 404
    });
  });

  test("returns shared trip data for a valid read-only token", async () => {
    const { service, shareRepository } = createTestService();

    shareRepository.seedShare({
      token: "valid-share-token-1234567890",
      tripId: "trip-1"
    });

    const result = await service.getSharedTrip(
      "valid-share-token-1234567890"
    );

    expect(result.trip).toMatchObject({
      id: "trip-1",
      title: trip.title
    });
    expect(result.share).toMatchObject({
      token: "valid-share-token-1234567890",
      permission: "read_only"
    });
  });

  test("returns safe not-found errors for invalid and expired tokens", async () => {
    const { service, shareRepository } = createTestService();

    shareRepository.seedShare({
      token: "expired-share-token-1234567890",
      tripId: "trip-1",
      expiresAt: "2026-01-01T00:00:00.000Z"
    });

    await expect(service.getSharedTrip("short")).rejects.toBeInstanceOf(
      ApiError
    );
    await expect(service.getSharedTrip("short")).rejects.toMatchObject({
      code: "SHARE_LINK_NOT_FOUND",
      statusCode: 404
    });
    await expect(
      service.getSharedTrip("expired-share-token-1234567890")
    ).rejects.toMatchObject({
      code: "SHARE_LINK_NOT_FOUND",
      statusCode: 404
    });
  });
});
