import { describe, expect, test } from "vitest";

import {
  API_BASE_PATH,
  PROJECT_NAME,
  apiErrorSchema,
  itinerarySchema,
  tripRequestSchema
} from "./index.js";

describe("shared package", () => {
  test("exports project constants", () => {
    expect(PROJECT_NAME).toBe("Japan Travel Planner AI");
    expect(API_BASE_PATH).toBe("/api");
  });

  test("exports shared schemas", () => {
    expect(tripRequestSchema).toBeDefined();
    expect(itinerarySchema).toBeDefined();
    expect(apiErrorSchema).toBeDefined();
  });
});
