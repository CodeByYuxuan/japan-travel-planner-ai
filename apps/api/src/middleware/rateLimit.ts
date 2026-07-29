import type { Request, RequestHandler } from "express";

import { ApiError } from "../errors/ApiError.js";

export type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitStore = {
  increment: (key: string, nowMs: number, windowMs: number) => RateLimitEntry;
};

export type RateLimitOptions = {
  clock?: () => number;
  errorCode?: string;
  errorMessage?: string;
  getIdentifier?: (request: Request) => string;
  max: number;
  onRateLimited?: (event: {
    identifier: string;
    request: Request;
    retryAfterSeconds: number;
  }) => Promise<void> | void;
  store?: RateLimitStore;
  windowMs: number;
};

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, RateLimitEntry>();

  increment(key: string, nowMs: number, windowMs: number): RateLimitEntry {
    const existingBucket = this.buckets.get(key);

    if (existingBucket === undefined || existingBucket.resetAt <= nowMs) {
      const nextBucket = {
        count: 1,
        resetAt: nowMs + windowMs
      };

      this.buckets.set(key, nextBucket);
      return nextBucket;
    }

    const nextBucket = {
      count: existingBucket.count + 1,
      resetAt: existingBucket.resetAt
    };

    this.buckets.set(key, nextBucket);
    return nextBucket;
  }
}

export function getClientRateLimitIdentifier(request: Request) {
  return request.ip || request.socket.remoteAddress || "unknown";
}

export function createRateLimitMiddleware(
  options: RateLimitOptions
): RequestHandler {
  validateRateLimitOptions(options);

  const clock = options.clock ?? Date.now;
  const getIdentifier = options.getIdentifier ?? getClientRateLimitIdentifier;
  const store = options.store ?? new InMemoryRateLimitStore();

  return (request, response, next) => {
    const nowMs = clock();
    const identifier = getIdentifier(request);
    const entry = store.increment(identifier, nowMs, options.windowMs);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((entry.resetAt - nowMs) / 1000)
    );

    response.setHeader("RateLimit-Limit", String(options.max));
    response.setHeader(
      "RateLimit-Remaining",
      String(Math.max(0, options.max - entry.count))
    );
    response.setHeader("RateLimit-Reset", String(retryAfterSeconds));

    if (entry.count <= options.max) {
      next();
      return;
    }

    response.setHeader("Retry-After", String(retryAfterSeconds));
    void options.onRateLimited?.({
      identifier,
      request,
      retryAfterSeconds
    });
    next(
      new ApiError({
        statusCode: 429,
        code: options.errorCode ?? "RATE_LIMITED",
        message:
          options.errorMessage ??
          "Too many itinerary generation requests. Try again later.",
        details: {
          retryAfterSeconds
        }
      })
    );
  };
}

function validateRateLimitOptions(options: RateLimitOptions) {
  if (!Number.isSafeInteger(options.max) || options.max < 1) {
    throw new Error("Rate limit max must be a positive integer.");
  }

  if (!Number.isSafeInteger(options.windowMs) || options.windowMs < 1) {
    throw new Error("Rate limit windowMs must be a positive integer.");
  }
}
