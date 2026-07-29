import { describe, expect, test } from "vitest";

import { combineTokenUsage, estimateAiCostUsd } from "./metrics.js";

describe("AI usage metrics", () => {
  test("combines usage across an initial request and repair request", () => {
    expect(
      combineTokenUsage(
        {
          inputTokens: 1_000,
          outputTokens: 200,
          totalTokens: 1_200
        },
        {
          inputTokens: 500,
          outputTokens: 100,
          totalTokens: 600
        }
      )
    ).toEqual({
      inputTokens: 1_500,
      outputTokens: 300,
      totalTokens: 1_800
    });
  });

  test("estimates cost only when token usage and both rates are present", () => {
    expect(
      estimateAiCostUsd(
        {
          inputTokens: 1_000,
          outputTokens: 200,
          totalTokens: 1_200
        },
        {
          inputCostPerMillionTokens: 2,
          outputCostPerMillionTokens: 8
        }
      )
    ).toBe(0.0036);

    expect(
      estimateAiCostUsd(
        {
          inputTokens: 1_000,
          outputTokens: 200
        },
        {
          inputCostPerMillionTokens: null,
          outputCostPerMillionTokens: null
        }
      )
    ).toBeNull();
  });
});
