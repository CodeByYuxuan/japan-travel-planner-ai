import { describe, expect, test, vi } from "vitest";

import {
  createAiUsageLogEntry,
  createConsoleAiUsageLogger,
  recordAiUsageSafely
} from "./usageLogger.js";

describe("AI usage logger", () => {
  test("records only safe structured metadata", () => {
    const entry = createAiUsageLogEntry(
      {
        attempts: 2,
        estimatedCostUsd: null,
        model: "gpt-test-model",
        outcome: "repaired_success",
        requestIdentifier: "203.0.113.10",
        tokenUsage: null,
        apiKey: "sk-secret-key",
        constraints: ["My private medical constraint"],
        rawModelResponse: '{"secret":"raw model output"}',
        rawPrompt: "Full prompt with sensitive user data"
      } as Parameters<typeof createAiUsageLogEntry>[0],
      new Date("2026-01-01T00:00:00.000Z")
    );
    const serializedEntry = JSON.stringify(entry);

    expect(entry).toMatchObject({
      attempts: 2,
      estimatedCostUsd: null,
      event: "ai_itinerary_usage",
      model: "gpt-test-model",
      outcome: "repaired_success",
      timestamp: "2026-01-01T00:00:00.000Z",
      tokenUsage: null
    });
    expect(entry.requestIdentifierHash).toHaveLength(64);
    expect(serializedEntry).not.toContain("203.0.113.10");
    expect(serializedEntry).not.toContain("sk-secret-key");
    expect(serializedEntry).not.toContain("Full prompt");
    expect(serializedEntry).not.toContain("raw model output");
    expect(serializedEntry).not.toContain("medical constraint");
  });

  test("sanitizes invalid numeric metadata", () => {
    const entry = createAiUsageLogEntry({
      attempts: -1,
      estimatedCostUsd: Number.NaN,
      model: "  ",
      outcome: "provider_request_failed",
      tokenUsage: {
        inputTokens: 100,
        outputTokens: -5,
        totalTokens: 200
      }
    });

    expect(entry.attempts).toBeNull();
    expect(entry.estimatedCostUsd).toBeNull();
    expect(entry.model).toBeNull();
    expect(entry.tokenUsage).toEqual({
      inputTokens: 100,
      totalTokens: 200
    });
  });

  test("writes sanitized entries through an injectable sink", () => {
    const sink = vi.fn();
    const logger = createConsoleAiUsageLogger({
      clock: () => new Date("2026-01-02T00:00:00.000Z"),
      sink
    });

    logger.recordUsage({
      attempts: 1,
      estimatedCostUsd: null,
      model: "gpt-test-model",
      outcome: "success",
      requestIdentifier: "test-client",
      tokenUsage: null
    });

    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        attempts: 1,
        model: "gpt-test-model",
        outcome: "success",
        timestamp: "2026-01-02T00:00:00.000Z"
      })
    );
  });

  test("swallows logger failures", async () => {
    await expect(
      recordAiUsageSafely(
        {
          recordUsage: () => {
            throw new Error("log sink unavailable");
          }
        },
        {
          outcome: "provider_request_failed"
        }
      )
    ).resolves.toBeUndefined();
  });
});
