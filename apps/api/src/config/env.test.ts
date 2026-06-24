import { describe, expect, test } from "vitest";

import { defaultApiEnv, loadApiEnv } from "./env.js";

describe("loadApiEnv", () => {
  test("returns default local API config", () => {
    expect(loadApiEnv({})).toEqual(defaultApiEnv);
  });

  test("parses explicit API config", () => {
    expect(
      loadApiEnv({
        AI_GENERATION_RATE_LIMIT_MAX: "9",
        AI_GENERATION_RATE_LIMIT_WINDOW_MS: "120000",
        API_PORT: "4001",
        OPENAI_API_KEY: "sk-test-api-key",
        OPENAI_MODEL: "gpt-test-model",
        WEATHER_API_KEY: "weather-test-key",
        WEB_ORIGIN: "https://planner.example.com",
        JWT_SECRET: "test-session-secret-value"
      })
    ).toEqual({
      aiGenerationRateLimitMax: 9,
      aiGenerationRateLimitWindowMs: 120000,
      apiPort: 4001,
      openAiApiKey: "sk-test-api-key",
      openAiModel: "gpt-test-model",
      weatherApiKey: "weather-test-key",
      webOrigin: "https://planner.example.com",
      jwtSecret: "test-session-secret-value"
    });
  });

  test("does not require provider keys during API env loading", () => {
    expect(loadApiEnv({}).openAiApiKey).toBeUndefined();
    expect(loadApiEnv({}).openAiModel).toBe(defaultApiEnv.openAiModel);
    expect(loadApiEnv({}).weatherApiKey).toBeUndefined();
  });

  test("fails clearly for invalid API_PORT", () => {
    expect(() =>
      loadApiEnv({
        API_PORT: "not-a-port",
        WEB_ORIGIN: "http://localhost:5173"
      })
    ).toThrow("Invalid API_PORT");
  });

  test("fails clearly for invalid AI generation rate limit config", () => {
    expect(() =>
      loadApiEnv({
        AI_GENERATION_RATE_LIMIT_MAX: "0"
      })
    ).toThrow("Invalid AI_GENERATION_RATE_LIMIT_MAX");
    expect(() =>
      loadApiEnv({
        AI_GENERATION_RATE_LIMIT_WINDOW_MS: "not-a-window"
      })
    ).toThrow("Invalid AI_GENERATION_RATE_LIMIT_WINDOW_MS");
  });

  test("fails clearly for invalid WEB_ORIGIN", () => {
    expect(() =>
      loadApiEnv({
        API_PORT: "3001",
        WEB_ORIGIN: "localhost:5173"
      })
    ).toThrow("Invalid WEB_ORIGIN");
  });

  test("fails clearly for too-short JWT_SECRET", () => {
    expect(() =>
      loadApiEnv({
        JWT_SECRET: "short"
      })
    ).toThrow("Invalid JWT_SECRET");
  });

  test("fails clearly when JWT_SECRET is missing in production", () => {
    expect(() =>
      loadApiEnv({
        NODE_ENV: "production"
      })
    ).toThrow("Invalid JWT_SECRET");
  });
});
