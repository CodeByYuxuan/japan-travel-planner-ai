import { randomBytes } from "node:crypto";

import { ApiError } from "../errors/ApiError.js";
import {
  createPrismaShareRepository,
  type ShareLinkRecord,
  type ShareRepository,
  type SharedTripRecord
} from "../repositories/shareRepository.js";
import {
  createPrismaTripRepository,
  type TripRepository
} from "../repositories/tripRepository.js";

export type PublicShareLink = Omit<ShareLinkRecord, "id" | "tripId">;

export type CreateShareLinkResult = {
  reused: boolean;
  share: PublicShareLink;
};

export type SharedTripResult = {
  share: PublicShareLink;
  trip: SharedTripRecord["trip"];
};

export type ShareServiceOptions = {
  now?: () => Date;
  tokenFactory?: () => string;
};

const shareTokenPattern = /^[A-Za-z0-9_-]{20,}$/;

export function createShareToken() {
  return randomBytes(32).toString("base64url");
}

function toPublicShareLink(share: ShareLinkRecord): PublicShareLink {
  return {
    token: share.token,
    permission: share.permission,
    expiresAt: share.expiresAt,
    createdAt: share.createdAt,
    updatedAt: share.updatedAt
  };
}

function createNotFoundError() {
  return new ApiError({
    statusCode: 404,
    code: "SHARE_LINK_NOT_FOUND",
    message: "Share link was not found."
  });
}

function assertUsableShareToken(token: string) {
  if (!shareTokenPattern.test(token)) {
    throw createNotFoundError();
  }
}

export class ShareService {
  private readonly now: () => Date;
  private readonly tokenFactory: () => string;

  constructor(
    private readonly tripRepository: TripRepository,
    private readonly shareRepository: ShareRepository,
    options: ShareServiceOptions = {}
  ) {
    this.now = options.now ?? (() => new Date());
    this.tokenFactory = options.tokenFactory ?? createShareToken;
  }

  async createShareLink(
    anonymousSessionId: string,
    tripId: string
  ): Promise<CreateShareLinkResult> {
    const owner = await this.tripRepository.findOrCreateOwner(
      anonymousSessionId
    );
    const trip = await this.tripRepository.findTrip(owner.id, tripId);

    if (trip === null) {
      throw new ApiError({
        statusCode: 404,
        code: "TRIP_NOT_FOUND",
        message: "Trip was not found."
      });
    }

    const existingShareLink =
      await this.shareRepository.findActiveReadOnlyByTripId(
        trip.id,
        this.now()
      );

    if (existingShareLink !== null) {
      return {
        reused: true,
        share: toPublicShareLink(existingShareLink)
      };
    }

    const share = await this.shareRepository.createReadOnlyLink(
      trip.id,
      this.tokenFactory()
    );

    return {
      reused: false,
      share: toPublicShareLink(share)
    };
  }

  async getSharedTrip(shareToken: string): Promise<SharedTripResult> {
    assertUsableShareToken(shareToken);

    const sharedTrip = await this.shareRepository.findReadOnlyTripByToken(
      shareToken,
      this.now()
    );

    if (sharedTrip === null) {
      throw createNotFoundError();
    }

    return {
      share: toPublicShareLink(sharedTrip.share),
      trip: sharedTrip.trip
    };
  }
}

export function createShareService(
  tripRepository: TripRepository = createPrismaTripRepository(),
  shareRepository: ShareRepository = createPrismaShareRepository(),
  options: ShareServiceOptions = {}
) {
  return new ShareService(tripRepository, shareRepository, options);
}
