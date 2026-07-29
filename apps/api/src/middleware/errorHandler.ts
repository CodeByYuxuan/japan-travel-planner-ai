import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import {
  ApiError,
  createApiErrorResponse,
  zodIssuesToFieldErrors
} from "../errors/ApiError.js";
import {
  logSafely,
  noopLogger,
  type AppLogger
} from "../observability/logger.js";
import { getRequestId, getRequestPath } from "./requestLogger.js";

function isJsonBodySyntaxError(error: unknown) {
  return error instanceof SyntaxError && "body" in error;
}

export function createErrorHandler(
  logger: AppLogger = noopLogger
): ErrorRequestHandler {
  return (error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    if (error instanceof ApiError) {
      logApiError(logger, request, {
        category: "api_error",
        code: error.code,
        errorName: error.name,
        statusCode: error.statusCode
      });
      response.status(error.statusCode).json(
        createApiErrorResponse({
          code: error.code,
          message: error.message,
          details: error.details,
          fieldErrors: error.fieldErrors
        })
      );
      return;
    }

    if (error instanceof ZodError) {
      logApiError(logger, request, {
        category: "validation",
        code: "VALIDATION_ERROR",
        errorName: error.name,
        statusCode: 400
      });
      response.status(400).json(
        createApiErrorResponse({
          code: "VALIDATION_ERROR",
          message: "Request validation failed.",
          fieldErrors: zodIssuesToFieldErrors(error)
        })
      );
      return;
    }

    if (isJsonBodySyntaxError(error)) {
      logApiError(logger, request, {
        category: "invalid_json",
        code: "INVALID_JSON",
        errorName: error instanceof Error ? error.name : "SyntaxError",
        statusCode: 400
      });
      response.status(400).json(
        createApiErrorResponse({
          code: "INVALID_JSON",
          message: "Request body must be valid JSON."
        })
      );
      return;
    }

    logApiError(logger, request, {
      category: "unexpected",
      code: "INTERNAL_SERVER_ERROR",
      errorName: error instanceof Error ? error.name : "UnknownError",
      statusCode: 500
    });
    response.status(500).json(
      createApiErrorResponse({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error."
      })
    );
  };
}

export const errorHandler = createErrorHandler();

function logApiError(
  logger: AppLogger,
  request: Parameters<ErrorRequestHandler>[1],
  metadata: {
    category: string;
    code: string;
    errorName: string;
    statusCode: number;
  }
) {
  const requestId = getRequestId(request);

  logSafely(
    logger,
    metadata.statusCode >= 500 ? "error" : "warn",
    "api_error",
    {
      ...metadata,
      method: request.method,
      path: getRequestPath(request) ?? request.path,
      ...(requestId !== undefined ? { requestId } : {})
    }
  );
}
