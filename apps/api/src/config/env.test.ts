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
        GOOGLE_MAPS_API_KEY: "google-routes-test-key",
        OPENAI_API_KEY: "sk-test-api-key",
        OPENAI_INPUT_COST_PER_MILLION_TOKENS: "2",
        OPENAI_MODEL: "gpt-test-model",
        OPENAI_OUTPUT_COST_PER_MILLION_TOKENS: "8",
        PROVIDER_RATE_LIMIT_MAX: "45",
        PROVIDER_RATE_LIMIT_WINDOW_MS: "90000",
        RAKUTEN_ACCESS_KEY: "rakuten-access-key",
        RAKUTEN_APP_ID: "rakuten-app-id",
        TRUST_PROXY_HOPS: "1",
        WEATHER_API_KEY: "weather-test-key",
        WEB_ORIGIN: "https://planner.example.com",
        JWT_SECRET: "test-session-secret-value"
      })
    ).toEqual({
      aiGenerationRateLimitMax: 9,
      aiGenerationRateLimitWindowMs: 120000,
      apiPort: 4001,
      googleMapsApiKey: "google-routes-test-key",
      openAiApiKey: "sk-test-api-key",
      openAiInputCostPerMillionTokens: 2,
      openAiModel: "gpt-test-model",
      openAiOutputCostPerMillionTokens: 8,
      providerRateLimitMax: 45,
      providerRateLimitWindowMs: 90000,
      rakutenAccessKey: "rakuten-access-key",
      rakutenAppId: "rakuten-app-id",
      sessionCookieSameSite: "Lax",
      sessionCookieSecure: false,
      trustProxyHops: 1,
      weatherApiKey: "weather-test-key",
      webOrigin: "https://planner.example.com",
      jwtSecret: "test-session-secret-value"
    });
  });

  test("does not require provider keys during API env loading", () => {
    expect(loadApiEnv({}).openAiApiKey).toBeUndefined();
    expect(loadApiEnv({}).openAiModel).toBe(defaultApiEnv.openAiModel);
    expect(loadApiEnv({}).openAiInputCostPerMillionTokens).toBeNull();
    expect(loadApiEnv({}).openAiOutputCostPerMillionTokens).toBeNull();
    expect(loadApiEnv({}).googleMapsApiKey).toBeUndefined();
    expect(loadApiEnv({}).rakutenAccessKey).toBeUndefined();
    expect(loadApiEnv({}).rakutenAppId).toBeUndefined();
    expect(loadApiEnv({}).weatherApiKey).toBeUndefined();
  });

  test("supports legacy RAKUTEN_API_KEY as the Rakuten app ID alias", () => {
    expect(
      loadApiEnv({
        RAKUTEN_ACCESS_KEY: "rakuten-access-key",
        RAKUTEN_API_KEY: "legacy-rakuten-app-id"
      })
    ).toMatchObject({
      rakutenAccessKey: "rakuten-access-key",
      rakutenAppId: "legacy-rakuten-app-id"
    });
  });

  test("fails clearly for invalid API_PORT", () => {
    expect(() =>
      loadApiEnv({
        API_PORT: "not-a-port",
        WEB_ORIGIN: "http://localhost:5173"
      })
    ).toThrow("Invalid API_PORT");
  });

  test("uses the hosting platform PORT when API_PORT is not set", () => {
    expect(
      loadApiEnv({
        PORT: "10000"
      })
    ).toMatchObject({
      apiPort: 10000
    });
  });

  test("prefers API_PORT over the hosting platform PORT", () => {
    expect(
      loadApiEnv({
        API_PORT: "4001",
        PORT: "10000"
      })
    ).toMatchObject({
      apiPort: 4001
    });
  });

  test("fails clearly for invalid hosting platform PORT", () => {
    expect(() =>
      loadApiEnv({
        PORT: "not-a-port"
      })
    ).toThrow("Invalid PORT");
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

  test("fails clearly for invalid provider rate limit config", () => {
    expect(() =>
      loadApiEnv({
        PROVIDER_RATE_LIMIT_MAX: "0"
      })
    ).toThrow("Invalid PROVIDER_RATE_LIMIT_MAX");
    expect(() =>
      loadApiEnv({
        PROVIDER_RATE_LIMIT_WINDOW_MS: "not-a-window"
      })
    ).toThrow("Invalid PROVIDER_RATE_LIMIT_WINDOW_MS");
  });

  test("validates reverse proxy hop configuration", () => {
    expect(loadApiEnv({ TRUST_PROXY_HOPS: "0" }).trustProxyHops).toBe(0);
    expect(loadApiEnv({ TRUST_PROXY_HOPS: "1" }).trustProxyHops).toBe(1);
    expect(() =>
      loadApiEnv({
        TRUST_PROXY_HOPS: "-1"
      })
    ).toThrow("Invalid TRUST_PROXY_HOPS");
    expect(() =>
      loadApiEnv({
        TRUST_PROXY_HOPS: "11"
      })
    ).toThrow("Invalid TRUST_PROXY_HOPS");
  });

  test("fails clearly for invalid OpenAI cost config", () => {
    expect(() =>
      loadApiEnv({
        OPENAI_INPUT_COST_PER_MILLION_TOKENS: "-1"
      })
    ).toThrow("Invalid OPENAI_INPUT_COST_PER_MILLION_TOKENS");
    expect(() =>
      loadApiEnv({
        OPENAI_OUTPUT_COST_PER_MILLION_TOKENS: "not-a-number"
      })
    ).toThrow("Invalid OPENAI_OUTPUT_COST_PER_MILLION_TOKENS");
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

  test("uses secure cross-site session cookies in production", () => {
    expect(
      loadApiEnv({
        JWT_SECRET: "production-session-secret",
        NODE_ENV: "production",
        WEB_ORIGIN: "https://planner.example.com"
      })
    ).toMatchObject({
      sessionCookieSameSite: "None",
      sessionCookieSecure: true
    });
  });
});
