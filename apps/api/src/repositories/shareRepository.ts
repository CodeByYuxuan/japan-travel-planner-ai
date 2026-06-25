import { prisma } from "../db/client.js";
import type { PrismaClient } from "../generated/prisma/client.js";

import {
  mapTrip,
  tripWithDaysInclude,
  type TripResponse
} from "./tripRepository.js";

export type SharePermission = "read_only";

export type ShareLinkRecord = {
  id: string;
  tripId: string;
  token: string;
  permission: SharePermission;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SharedTripRecord = {
  share: ShareLinkRecord;
  trip: TripResponse;
};

export type ShareRepository = {
  createReadOnlyLink(
    tripId: string,
    token: string,
    expiresAt?: Date | null
  ): Promise<ShareLinkRecord>;
  findActiveReadOnlyByTripId(
    tripId: string,
    now?: Date
  ): Promise<ShareLinkRecord | null>;
  findReadOnlyTripByToken(
    token: string,
    now?: Date
  ): Promise<SharedTripRecord | null>;
};

type PrismaShareLinkRecord = {
  id: string;
  tripId: string;
  token: string;
  permission: string;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapShareLink(shareLink: PrismaShareLinkRecord): ShareLinkRecord {
  return {
    id: shareLink.id,
    tripId: shareLink.tripId,
    token: shareLink.token,
    permission: "read_only",
    expiresAt: shareLink.expiresAt?.toISOString() ?? null,
    createdAt: shareLink.createdAt.toISOString(),
    updatedAt: shareLink.updatedAt.toISOString()
  };
}

function activeReadOnlyWhere(now: Date) {
  return {
    permission: "read_only",
    OR: [
      {
        expiresAt: null
      },
      {
        expiresAt: {
          gt: now
        }
      }
    ]
  };
}

export function createPrismaShareRepository(
  client: PrismaClient = prisma
): ShareRepository {
  return {
    async createReadOnlyLink(tripId, token, expiresAt = null) {
      const shareLink = await client.shareLink.create({
        data: {
          expiresAt,
          permission: "read_only",
          token,
          tripId
        }
      });

      return mapShareLink(shareLink as PrismaShareLinkRecord);
    },

    async findActiveReadOnlyByTripId(tripId, now = new Date()) {
      const shareLink = await client.shareLink.findFirst({
        where: {
          tripId,
          ...activeReadOnlyWhere(now)
        },
        orderBy: {
          createdAt: "asc"
        }
      });

      return shareLink === null
        ? null
        : mapShareLink(shareLink as PrismaShareLinkRecord);
    },

    async findReadOnlyTripByToken(token, now = new Date()) {
      const shareLink = await client.shareLink.findFirst({
        where: {
          token,
          ...activeReadOnlyWhere(now)
        },
        include: {
          trip: {
            include: tripWithDaysInclude
          }
        }
      });

      if (shareLink === null) {
        return null;
      }

      return {
        share: mapShareLink(shareLink as PrismaShareLinkRecord),
        trip: mapTrip(shareLink.trip)
      };
    }
  };
}
