import type { Request, RequestHandler } from "express";
import type { ZodError, ZodType } from "zod";

import {
  createApiErrorResponse,
  zodIssuesToFieldErrors
} from "../errors/ApiError.js";

export type ValidateRequestOptions = {
  onValidationError?: (context: { error: ZodError; request: Request }) => void;
};

export function validateRequest(
  schema: ZodType,
  options: ValidateRequestOptions = {}
): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      options.onValidationError?.({
        error: result.error,
        request
      });
      response.status(400).json(
        createApiErrorResponse({
          code: "VALIDATION_ERROR",
          message: "Request validation failed.",
          fieldErrors: zodIssuesToFieldErrors(result.error)
        })
      );
      return;
    }

    request.body = result.data;
    next();
  };
}
