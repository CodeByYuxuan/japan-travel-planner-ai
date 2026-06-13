import { describe, expect, test } from "vitest";

import { itinerarySchema, type Itinerary } from "./itinerary.js";

const validActivity = {
  title: "Explore Asakusa",
  category: "culture",
  timing: {
    startTime: "10:00",
    endTime: "12:00"
  },
  durationMinutes: 120,
  location: {
    name: "Senso-ji",
    city: "Tokyo"
  },
  costLevel: "free",
  notes: "Start early to avoid the busiest crowds."
};

const validDay = {
  date: "2026-10-01",
  city: "Tokyo",
  summary: "Arrival day with a relaxed neighborhood walk.",
  activities: [validActivity]
};

const validItinerary = {
  title: "Tokyo Food And Culture",
  startDate: "2026-10-01",
  endDate: "2026-10-02",
  days: [validDay]
};

describe("itinerarySchema", () => {
  test("accepts a structured itinerary with days and activities", () => {
    const result = itinerarySchema.safeParse(validItinerary);

    expect(result.success).toBe(true);

    if (result.success) {
      const itinerary: Itinerary = result.data;
      expect(itinerary.days[0]?.activities[0]?.location.name).toBe("Senso-ji");
    }
  });

  test("rejects activities without a duration", () => {
    const result = itinerarySchema.safeParse({
      ...validItinerary,
      days: [
        {
          ...validDay,
          activities: [
            {
              ...validActivity,
              durationMinutes: undefined
            }
          ]
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  test("rejects an empty day list", () => {
    const result = itinerarySchema.safeParse({
      ...validItinerary,
      days: []
    });

    expect(result.success).toBe(false);
  });
});
