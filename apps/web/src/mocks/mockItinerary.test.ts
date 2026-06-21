import { describe, expect, test } from "vitest";

import { itinerarySchema } from "../../../../packages/shared/src/schemas/itinerary.js";
import { tripRequestSchema } from "../../../../packages/shared/src/schemas/tripRequest.js";
import { mockItinerary } from "./mockItinerary.js";
import { mockTripRequest } from "./mockTripRequest.js";

describe("mock itinerary fixtures", () => {
  test("mock trip request validates against the shared schema", () => {
    expect(() => tripRequestSchema.parse(mockTripRequest)).not.toThrow();
  });

  test("mock itinerary validates against the shared schema", () => {
    expect(() => itinerarySchema.parse(mockItinerary)).not.toThrow();
  });

  test("mock itinerary provides multiple complete activities per day", () => {
    expect(mockItinerary.days.length).toBeGreaterThan(1);

    for (const day of mockItinerary.days) {
      expect(day.activities.length).toBeGreaterThan(1);

      for (const activity of day.activities) {
        expect(activity.location.name).toBeTruthy();
        expect(activity.timing.startTime ?? activity.timing.timeOfDay).toBeTruthy();
        expect(activity.durationMinutes).toBeGreaterThan(0);
        expect(activity.costLevel).toBeTruthy();
        expect(activity.category).toBeTruthy();
        expect(activity.notes).toBeTruthy();
      }
    }
  });
});
