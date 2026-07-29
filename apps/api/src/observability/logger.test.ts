import { describe, expect, test, vi } from "vitest";

import {
  createConsoleLogger,
  logSafely,
  redactSensitiveData,
  type LogEntry
} from "./logger.js";

describe("structured logger", () => {
  test("recursively redacts secrets while preserving safe token metrics", () => {
    const result = redactSensitiveData({
      authorization: "Bearer top-secret-token",
      nested: {
        apiKey: "sk-provider-secret",
        databaseUrl: "postgresql://postgres:password@localhost:5432/trips",
        outputTokens: 42,
        tokenUsage: {
          inputTokens: 100,
          totalTokens: 142
        },
        url: "https://example.com/path?api_key=secret-value&city=Tokyo"
      }
    });
    const serializedResult = JSON.stringify(result);

    expect(result).toMatchObject({
      authorization: "[REDACTED]",
      nested: {
        apiKey: "[REDACTED]",
        databaseUrl: "[REDACTED]",
        outputTokens: 42,
        tokenUsage: {
          inputTokens: 100,
          totalTokens: 142
        }
      }
    });
    expect(serializedResult).not.toContain("top-secret-token");
    expect(serializedResult).not.toContain("sk-provider-secret");
    expect(serializedResult).not.toContain("password");
    expect(serializedResult).not.toContain("secret-value");
  });

  test("records safe JSON entries through an injectable sink", () => {
    const entries: LogEntry[] = [];
    const logger = createConsoleLogger({
      clock: () => new Date("2026-07-29T00:00:00.000Z"),
      sink: (entry) => entries.push(entry)
    });

    logger.info("test_event", {
      apiKey: "sk-secret-value",
      requestId: "request-123",
      statusCode: 200
    });

    expect(entries).toEqual([
      {
        apiKey: "[REDACTED]",
        event: "test_event",
        level: "info",
        requestId: "request-123",
        statusCode: 200,
        timestamp: "2026-07-29T00:00:00.000Z"
      }
    ]);
  });

  test("prevents an injected logging failure from affecting runtime flow", () => {
    const logger = {
      error: vi.fn(),
      info: vi.fn(() => {
        throw new Error("sink unavailable");
      }),
      warn: vi.fn()
    };

    expect(() =>
      logSafely(logger, "info", "test_event", {
        statusCode: 200
      })
    ).not.toThrow();
  });
});
