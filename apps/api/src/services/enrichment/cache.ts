import { createHash } from "node:crypto";

import {
  createPrismaProviderResultRepository,
  type ProviderResultRepository
} from "../../repositories/providerResultRepository.js";

export type ProviderCacheSource = "cache" | "provider";

export type JsonSafeValue =
  | null
  | boolean
  | number
  | string
  | JsonSafeValue[]
  | { [key: string]: JsonSafeValue };

export type ProviderResultCacheIdentity = {
  cacheKey: string;
  normalizedInput: JsonSafeValue;
  requestHash: string;
};

export type ProviderResultCacheGetOrSetOptions<TValue> = {
  provider: string;
  operation: string;
  input: unknown;
  ttlMs: number;
  load: () => Promise<TValue>;
  isCachedValue?: ((value: unknown) => value is TValue) | undefined;
  now?: Date | undefined;
  shouldCache?: ((value: TValue) => boolean) | undefined;
};

export type ProviderResultCacheGetOrSetResult<TValue> = {
  cacheKey: string;
  source: ProviderCacheSource;
  value: TValue;
};

export type ProviderResultCache = {
  getOrSet<TValue>(
    options: ProviderResultCacheGetOrSetOptions<TValue>
  ): Promise<ProviderResultCacheGetOrSetResult<TValue>>;
};

const secretFieldPattern =
  /(?:api[_-]?key|authorization|auth|cookie|header|password|secret|token)/i;

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function normalizeCacheInput(value: unknown): JsonSafeValue {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    return normalizeText(value);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(6)) : null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeCacheInput(item));
  }

  if (isPlainObject(value)) {
    const normalizedEntries = Object.entries(value)
      .filter(([key, entryValue]) => {
        if (entryValue === undefined) {
          return false;
        }

        return !secretFieldPattern.test(key);
      })
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, entryValue]) => [key, normalizeCacheInput(entryValue)]);

    return Object.fromEntries(normalizedEntries) as JsonSafeValue;
  }

  return String(value);
}

export function stableStringify(value: JsonSafeValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey)
  );

  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableStringify(entryValue)}`
    )
    .join(",")}}`;
}

function hashCachePayload(value: JsonSafeValue) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function createProviderResultCacheIdentity(options: {
  provider: string;
  operation: string;
  input: unknown;
}): ProviderResultCacheIdentity {
  const normalizedInput = normalizeCacheInput(options.input);
  const payload = {
    input: normalizedInput,
    operation: normalizeText(options.operation),
    provider: normalizeText(options.provider)
  } satisfies JsonSafeValue;
  const requestHash = hashCachePayload(payload);

  return {
    cacheKey: `${payload.provider}:${payload.operation}:${requestHash}`,
    normalizedInput,
    requestHash
  };
}

function getExpiresAt(now: Date, ttlMs: number) {
  return new Date(now.getTime() + ttlMs);
}

export async function getOrSetProviderResult<TValue>(
  repository: ProviderResultRepository,
  options: ProviderResultCacheGetOrSetOptions<TValue>
): Promise<ProviderResultCacheGetOrSetResult<TValue>> {
  const now = options.now ?? new Date();
  const identity = createProviderResultCacheIdentity(options);

  try {
    const cachedResult = await repository.findUsable(identity.cacheKey, now);

    if (
      cachedResult !== null &&
      (options.isCachedValue === undefined ||
        options.isCachedValue(cachedResult.responseJson))
    ) {
      return {
        cacheKey: identity.cacheKey,
        source: "cache",
        value: cachedResult.responseJson as TValue
      };
    }
  } catch {
    // Cache misses and read failures should not block provider enrichment.
  }

  const value = await options.load();
  const shouldCache = options.shouldCache?.(value) ?? true;

  if (shouldCache) {
    try {
      await repository.upsert({
        provider: options.provider,
        operation: options.operation,
        cacheKey: identity.cacheKey,
        requestHash: identity.requestHash,
        requestJson: identity.normalizedInput,
        responseJson: value,
        expiresAt: getExpiresAt(now, options.ttlMs)
      });
    } catch {
      // Provider data is still useful when cache persistence is unavailable.
    }
  }

  return {
    cacheKey: identity.cacheKey,
    source: "provider",
    value
  };
}

export function createProviderResultCache(
  repository: ProviderResultRepository = createPrismaProviderResultRepository()
): ProviderResultCache {
  return {
    getOrSet(options) {
      return getOrSetProviderResult(repository, options);
    }
  };
}
