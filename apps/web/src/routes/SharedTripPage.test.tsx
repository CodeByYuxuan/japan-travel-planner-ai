import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { mockItinerary, mockTripRequest } from "../mocks/index.js";

import { SharedTripPage } from "./SharedTripPage.js";

const sharedTrip = {
  share: {
    token: "public-share-token-1234567890abcdef",
    permission: "read_only" as const,
    expiresAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  trip: {
    id: "trip-1",
    title: mockItinerary.title,
    startDate: mockTripRequest.startDate,
    endDate: mockTripRequest.endDate,
    cities: [...mockTripRequest.cities],
    interests: [...mockTripRequest.interests],
    pace: mockTripRequest.pace,
    budget: mockTripRequest.budget,
    constraints: [...mockTripRequest.constraints],
    days: mockItinerary.days.map((day, dayIndex) => ({
      id: `day-${dayIndex + 1}`,
      ...day,
      activities: day.activities.map((activity, activityIndex) => ({
        ...activity,
        id: activity.id ?? `activity-${dayIndex + 1}-${activityIndex + 1}`
      }))
    })),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
};

describe("SharedTripPage", () => {
  test("renders a shared itinerary as read-only", () => {
    const html = renderToString(
      <SharedTripPage
        initialSharedTrip={sharedTrip}
        shareToken="public-share-token-1234567890abcdef"
      />
    );

    expect(html).toContain("Shared itinerary");
    expect(html).toContain(mockItinerary.title);
    expect(html).toContain("Morning walk through Ueno Park");
    expect(html).toContain("Open in Google Maps");
    expect(html).toContain("Read-only");
    expect(html).not.toContain("Edit");
    expect(html).not.toContain("Delete");
    expect(html).not.toContain("Add activity");
    expect(html).not.toContain("Save itinerary");
    expect(html).not.toContain("Revert local edits");
    expect(html).not.toContain("Generate AI itinerary");
    expect(html).not.toContain("Trip storage");
  });

  test("renders a recoverable error state for unavailable share links", () => {
    const html = renderToString(
      <SharedTripPage
        initialErrorMessage="Share link was not found."
        initialSharedTrip={null}
        shareToken="missing-share-token-1234567890"
      />
    );

    expect(html).toContain("Share link not available");
    expect(html).toContain("Share link was not found.");
    expect(html).not.toContain("Save itinerary");
    expect(html).not.toContain("Generate AI itinerary");
  });
});
