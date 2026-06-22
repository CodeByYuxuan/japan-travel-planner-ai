import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import {
  ApiError,
  createApiErrorResponse,
  zodIssuesToFieldErrors
} from "../errors/ApiError.js";

function isJsonBodySyntaxError(error: unknown) {
  return error instanceof SyntaxError && "body" in error;
}

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
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
    response.status(400).json(
      createApiErrorResponse({
        code: "INVALID_JSON",
        message: "Request body must be valid JSON."
      })
    );
    return;
  }

  response.status(500).json(
    createApiErrorResponse({
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error."
    })
  );
};
