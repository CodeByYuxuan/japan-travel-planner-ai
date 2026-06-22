import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import {
  createApiErrorResponse,
  zodIssuesToFieldErrors
} from "../errors/ApiError.js";

export function validateRequest(schema: ZodType): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
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
