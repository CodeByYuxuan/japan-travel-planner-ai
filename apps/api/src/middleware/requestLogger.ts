import { randomUUID } from "node:crypto";

import type { Request, RequestHandler } from "express";

import { logSafely, type AppLogger } from "../observability/logger.js";

const requestIdProperty = Symbol("requestId");
const requestPathProperty = Symbol("requestPath");
const validRequestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;

type RequestWithId = Request & {
  [requestIdProperty]?: string;
  [requestPathProperty]?: string;
};

export type RequestLoggerOptions = {
  clock?: () => number;
  createRequestId?: () => string;
  logger: AppLogger;
};

export function createRequestLogger(
  options: RequestLoggerOptions
): RequestHandler {
  const clock = options.clock ?? Date.now;
  const createRequestId = options.createRequestId ?? randomUUID;

  return (request, response, next) => {
    const startedAt = clock();
    const path = request.path;
    const requestId =
      normalizeRequestId(request.get("x-request-id")) ?? createRequestId();

    (request as RequestWithId)[requestIdProperty] = requestId;
    (request as RequestWithId)[requestPathProperty] = path;
    response.setHeader("X-Request-Id", requestId);
    response.once("finish", () => {
      logSafely(options.logger, "info", "http_request_completed", {
        durationMs: Math.max(0, clock() - startedAt),
        method: request.method,
        path,
        requestId,
        statusCode: response.statusCode
      });
    });

    next();
  };
}

export function getRequestId(request: Request) {
  return (request as RequestWithId)[requestIdProperty];
}

export function getRequestPath(request: Request) {
  return (request as RequestWithId)[requestPathProperty];
}

function normalizeRequestId(value: string | undefined) {
  const requestId = value?.trim();

  return requestId !== undefined && validRequestIdPattern.test(requestId)
    ? requestId
    : null;
}
