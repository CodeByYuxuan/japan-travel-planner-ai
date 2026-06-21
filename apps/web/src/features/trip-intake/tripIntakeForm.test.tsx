import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ItineraryView } from "../itinerary/ItineraryView.js";
import { mockTripRequest } from "../../mocks/index.js";
import { TripIntakeForm } from "./TripIntakeForm.js";
import {
  emptyTripIntakeValues,
  submitTripIntake,
  tripIntakeInitialValues,
  validateTripIntake
} from "./formState.js";

describe("TripIntakeForm", () => {
  test("renders the required trip request fields", () => {
    const html = renderToString(
      <TripIntakeForm onMockSubmit={() => undefined} />
    );

    expect(html).toContain("Start date");
    expect(html).toContain("End date");
    expect(html).toContain("Cities");
    expect(html).toContain("Interests");
    expect(html).toContain("Travel pace");
    expect(html).toContain("Budget");
    expect(html).toContain("Constraints");
  });

  test("returns required field errors", () => {
    const result = validateTripIntake(emptyTripIntakeValues);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.errors).toMatchObject({
        startDate: "Start date is required.",
        endDate: "End date is required.",
        cities: "Add at least one city.",
        interests: "Add at least one interest.",
        pace: "Choose a travel pace.",
        budget: "Choose a budget."
      });
    }
  });

  test("returns validation errors for invalid date ranges", () => {
    const result = validateTripIntake({
      ...tripIntakeInitialValues,
      startDate: "2026-04-09",
      endDate: "2026-04-08"
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.errors.endDate).toBe(
        "End date must be on or after the start date."
      );
    }
  });

  test("creates a schema-valid request for valid submissions", () => {
    const result = submitTripIntake(tripIntakeInitialValues);

    expect(result.status).toBe("success");

    if (result.status === "success") {
      expect(result.request).toEqual(mockTripRequest);
      expect(result.itinerary.title).toBe("Tokyo And Kyoto Spring Highlights");
    }
  });

  test("supports rendering the mock itinerary after submit", () => {
    const result = submitTripIntake(tripIntakeInitialValues);

    expect(result.status).toBe("success");

    if (result.status === "success") {
      const html = renderToString(
        <ItineraryView itinerary={result.itinerary} />
      );

      expect(html).toContain("Tokyo And Kyoto Spring Highlights");
      expect(html).toContain("Morning walk through Ueno Park");
    }
  });
});
