import express from "express";
import request from "supertest";
import { afterEach, describe, expect, test } from "vitest";
import { z } from "zod";

import { apiErrorSchema } from "../../../../packages/shared/src/schemas/apiError.js";
import { ApiError } from "../errors/ApiError.js";

import { errorHandler } from "./errorHandler.js";
import { validateRequest } from "./validateRequest.js";

const testBodySchema = z
  .object({
    name: z.string().min(1),
    count: z.number().int().positive()
  })
  .strict();

const originalNodeEnv = process.env.NODE_ENV;

function createMiddlewareTestApp() {
  const app = express();

  app.use(express.json());
  app.post(
    "/test/validated",
    validateRequest(testBodySchema),
    (request, response) => {
      response.status(201).json({
        body: request.body
      });
    }
  );
  app.get("/test/known-error", () => {
    throw new ApiError({
      statusCode: 409,
      code: "KNOWN_CONFLICT",
      message: "Known conflict."
    });
  });
  app.get("/test/unexpected-error", () => {
    throw new Error("Sensitive database connection string leaked.");
  });
  app.use(errorHandler);

  return app;
}

function expectSharedErrorResponse(responseBody: unknown) {
  const result = apiErrorSchema.safeParse(responseBody);

  expect(result.success).toBe(true);
}

describe("validateRequest", () => {
  test("returns structured validation errors for invalid request bodies", async () => {
    const response = await request(createMiddlewareTestApp())
      .post("/test/validated")
      .send({
        name: "",
        count: 0
      });

    expect(response.status).toBe(400);
    expectSharedErrorResponse(response.body);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed."
      }
    });
    expect(response.body.error.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "name"
        }),
        expect.objectContaining({
          path: "count"
        })
      ])
    );
  });

  test("passes valid request bodies through to the next handler", async () => {
    const response = await request(createMiddlewareTestApp())
      .post("/test/validated")
      .send({
        name: "Tokyo food walk",
        count: 2
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      body: {
        name: "Tokyo food walk",
        count: 2
      }
    });
  });
});

describe("errorHandler", () => {
  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
      return;
    }

    process.env.NODE_ENV = originalNodeEnv;
  });

  test("returns structured responses for known API errors", async () => {
    const response = await request(createMiddlewareTestApp()).get(
      "/test/known-error"
    );

    expect(response.status).toBe(409);
    expectSharedErrorResponse(response.body);
    expect(response.body).toEqual({
      error: {
        code: "KNOWN_CONFLICT",
        message: "Known conflict."
      }
    });
  });

  test("returns safe structured responses for unexpected errors", async () => {
    const response = await request(createMiddlewareTestApp()).get(
      "/test/unexpected-error"
    );

    expect(response.status).toBe(500);
    expectSharedErrorResponse(response.body);
    expect(response.body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error."
      }
    });
  });

  test("does not expose stack traces in non-development mode", async () => {
    process.env.NODE_ENV = "production";

    const response = await request(createMiddlewareTestApp()).get(
      "/test/unexpected-error"
    );
    const serializedBody = JSON.stringify(response.body);

    expect(response.status).toBe(500);
    expect(serializedBody).not.toContain("Sensitive database");
    expect(serializedBody).not.toContain("stack");
  });

  test("returns structured errors for invalid JSON bodies", async () => {
    const response = await request(createMiddlewareTestApp())
      .post("/test/validated")
      .set("Content-Type", "application/json")
      .send("{ invalid json");

    expect(response.status).toBe(400);
    expectSharedErrorResponse(response.body);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON."
      }
    });
  });
});
