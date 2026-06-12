import { describe, expect, test } from "vitest";

import { API_BASE_PATH, PROJECT_NAME } from "./index.js";

describe("shared package", () => {
  test("exports project constants", () => {
    expect(PROJECT_NAME).toBe("Japan Travel Planner AI");
    expect(API_BASE_PATH).toBe("/api");
  });
});
