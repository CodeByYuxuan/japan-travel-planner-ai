import { prisma } from "../db/client.js";
import {
  Prisma,
  type PrismaClient
} from "../generated/prisma/client.js";

export type ProviderResultRecord = {
  id: string;
  provider: string;
  operation: string;
  cacheKey: string;
  requestHash: string;
  requestJson: unknown;
  responseJson: unknown;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ProviderResultWriteInput = {
  provider: string;
  operation: string;
  cacheKey: string;
  requestHash: string;
  requestJson: unknown;
  responseJson: unknown;
  expiresAt: Date;
};

export type ProviderResultRepository = {
  findUsable(
    cacheKey: string,
    now?: Date
  ): Promise<ProviderResultRecord | null>;
  upsert(input: ProviderResultWriteInput): Promise<ProviderResultRecord>;
};

type PrismaProviderResult = {
  id: string;
  provider: string;
  operation: string;
  cacheKey: string;
  requestHash: string;
  requestJson: unknown;
  responseJson: unknown;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function toInputJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function mapProviderResult(result: PrismaProviderResult): ProviderResultRecord {
  return {
    id: result.id,
    provider: result.provider,
    operation: result.operation,
    cacheKey: result.cacheKey,
    requestHash: result.requestHash,
    requestJson: result.requestJson,
    responseJson: result.responseJson,
    expiresAt: result.expiresAt,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt
  };
}

export function createPrismaProviderResultRepository(
  client: PrismaClient = prisma
): ProviderResultRepository {
  return {
    async findUsable(cacheKey, now = new Date()) {
      const result = await client.providerResult.findFirst({
        where: {
          cacheKey,
          expiresAt: {
            gt: now
          }
        }
      });

      return result === null
        ? null
        : mapProviderResult(result as PrismaProviderResult);
    },

    async upsert(input) {
      const data = {
        provider: input.provider,
        operation: input.operation,
        requestHash: input.requestHash,
        requestJson: toInputJson(input.requestJson),
        responseJson: toInputJson(input.responseJson),
        expiresAt: input.expiresAt
      };
      const result = await client.providerResult.upsert({
        where: {
          cacheKey: input.cacheKey
        },
        create: {
          cacheKey: input.cacheKey,
          ...data
        },
        update: data
      });

      return mapProviderResult(result as PrismaProviderResult);
    }
  };
}
