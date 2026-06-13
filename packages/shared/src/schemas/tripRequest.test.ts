import { describe, expect, test } from "vitest";

import { tripRequestSchema, type TripRequest } from "./tripRequest.js";

describe("tripRequestSchema", () => {
  test("accepts the MVP trip request fields", () => {
    const result = tripRequestSchema.safeParse({
      startDate: "2026-10-01",
      endDate: "2026-10-07",
      cities: ["Tokyo", "Kyoto"],
      interests: ["food", "culture"],
      pace: "balanced",
      budget: "moderate",
      constraints: ["vegetarian options"]
    });

    expect(result.success).toBe(true);

    if (result.success) {
      const request: TripRequest = result.data;
      expect(request.cities).toContain("Tokyo");
    }
  });

  test("defaults constraints to an empty list", () => {
    const result = tripRequestSchema.safeParse({
      startDate: "2026-10-01",
      endDate: "2026-10-07",
      cities: ["Tokyo"],
      interests: ["food"],
      pace: "relaxed",
      budget: "budget"
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.constraints).toEqual([]);
    }
  });

  test("rejects a request without cities", () => {
    const result = tripRequestSchema.safeParse({
      startDate: "2026-10-01",
      endDate: "2026-10-07",
      cities: [],
      interests: ["food"],
      pace: "balanced",
      budget: "moderate",
      constraints: []
    });

    expect(result.success).toBe(false);
  });

  test("rejects an end date before the start date", () => {
    const result = tripRequestSchema.safeParse({
      startDate: "2026-10-07",
      endDate: "2026-10-01",
      cities: ["Tokyo"],
      interests: ["food"],
      pace: "balanced",
      budget: "moderate",
      constraints: []
    });

    expect(result.success).toBe(false);
  });
});
