import { describe, expect, test } from "vitest";

import { apiErrorSchema, type ApiError } from "./apiError.js";

describe("apiErrorSchema", () => {
  test("accepts a reusable API error payload", () => {
    const result = apiErrorSchema.safeParse({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        fieldErrors: [
          {
            path: "cities.0",
            message: "City is required."
          }
        ]
      }
    });

    expect(result.success).toBe(true);

    if (result.success) {
      const error: ApiError = result.data;
      expect(error.error.code).toBe("VALIDATION_ERROR");
    }
  });

  test("rejects an error without a message", () => {
    const result = apiErrorSchema.safeParse({
      error: {
        code: "VALIDATION_ERROR"
      }
    });

    expect(result.success).toBe(false);
  });
});
