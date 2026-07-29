import express from "express";
import request from "supertest";
import { describe, expect, test } from "vitest";

import { createConsoleLogger, type LogEntry } from "../observability/logger.js";
import { createRequestLogger, getRequestId } from "./requestLogger.js";

describe("request logger", () => {
  test("propagates a safe incoming request ID and records completion metadata", async () => {
    const entries: LogEntry[] = [];
    const clockValues = [1_000, 1_025];
    const app = express();

    app.use(
      createRequestLogger({
        clock: () => clockValues.shift() ?? 1_025,
        logger: createConsoleLogger({
          clock: () => new Date("2026-07-29T00:00:00.000Z"),
          sink: (entry) => entries.push(entry)
        })
      })
    );
    app.get("/test", (request, response) => {
      response.status(200).json({
        requestId: getRequestId(request)
      });
    });

    const response = await request(app)
      .get("/test?api_key=must-not-be-logged")
      .set("X-Request-Id", "request-123");

    expect(response.headers["x-request-id"]).toBe("request-123");
    expect(response.body).toEqual({
      requestId: "request-123"
    });
    expect(entries).toEqual([
      expect.objectContaining({
        durationMs: 25,
        event: "http_request_completed",
        method: "GET",
        path: "/test",
        requestId: "request-123",
        statusCode: 200
      })
    ]);
    expect(JSON.stringify(entries)).not.toContain("must-not-be-logged");
  });

  test("replaces an invalid incoming request ID", async () => {
    const app = express();

    app.use(
      createRequestLogger({
        createRequestId: () => "generated-request-id",
        logger: createConsoleLogger({
          sink: () => {}
        })
      })
    );
    app.get("/test", (_request, response) => {
      response.sendStatus(204);
    });

    const response = await request(app)
      .get("/test")
      .set("X-Request-Id", "invalid request id with spaces");

    expect(response.headers["x-request-id"]).toBe("generated-request-id");
  });

  test("keeps the original path after a mounted router handles the request", async () => {
    const entries: LogEntry[] = [];
    const app = express();
    const router = express.Router();

    app.use(
      createRequestLogger({
        logger: createConsoleLogger({
          sink: (entry) => entries.push(entry)
        })
      })
    );
    router.get("/", (_request, response) => {
      response.sendStatus(204);
    });
    app.use("/api/health", router);

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(204);
    expect(entries).toEqual([
      expect.objectContaining({
        path: "/api/health"
      })
    ]);
  });
});
