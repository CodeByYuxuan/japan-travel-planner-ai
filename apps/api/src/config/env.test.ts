import { describe, expect, test } from "vitest";

import { defaultApiEnv, loadApiEnv } from "./env.js";

describe("loadApiEnv", () => {
  test("returns default local API config", () => {
    expect(loadApiEnv({})).toEqual(defaultApiEnv);
  });

  test("parses explicit API config", () => {
    expect(
      loadApiEnv({
        API_PORT: "4001",
        WEB_ORIGIN: "https://planner.example.com"
      })
    ).toEqual({
      apiPort: 4001,
      webOrigin: "https://planner.example.com"
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

  test("fails clearly for invalid WEB_ORIGIN", () => {
    expect(() =>
      loadApiEnv({
        API_PORT: "3001",
        WEB_ORIGIN: "localhost:5173"
      })
    ).toThrow("Invalid WEB_ORIGIN");
  });
});
