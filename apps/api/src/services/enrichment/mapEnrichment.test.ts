import { describe, expect, test, vi } from "vitest";

import type { Activity } from "@japan-travel-planner/shared";

import type { MapsProvider } from "../../providers/maps/mapsProvider.js";
import {
  enrichActivityWithMapLink,
  getActivityMapUrl
} from "./mapEnrichment.js";

const activity: Activity = {
  title: "Senso-ji morning visit",
  category: "culture",
  timing: {
    timeOfDay: "morning"
  },
  durationMinutes: 90,
  location: {
    name: "Senso-ji",
    city: "Tokyo"
  },
  costLevel: "free",
  notes: "Arrive before the busiest temple hours."
};

describe("map enrichment", () => {
  test("creates an activity map URL from activity location", () => {
    expect(getActivityMapUrl(activity)).toBe(
      "https://www.google.com/maps/search/?api=1&query=Senso-ji%20morning%20visit%20Senso-ji%20Tokyo"
    );
  });

  test("preserves existing activity map URLs", () => {
    const provider = {
      createSearchLink: vi.fn(() => "https://example.com/generated")
    } satisfies MapsProvider;
    const existingMapUrl = "https://www.google.com/maps/place/Senso-ji";

    expect(
      getActivityMapUrl(
        {
          ...activity,
          location: {
            ...activity.location,
            mapUrl: existingMapUrl
          }
        },
        provider
      )
    ).toBe(existingMapUrl);
    expect(provider.createSearchLink).not.toHaveBeenCalled();
  });

  test("adds a generated map URL without mutating the source activity", () => {
    const enrichedActivity = enrichActivityWithMapLink(activity);

    expect(enrichedActivity.location.mapUrl).toContain(
      "https://www.google.com/maps/search/"
    );
    expect(activity.location.mapUrl).toBeUndefined();
  });

  test("degrades gracefully when the provider fails", () => {
    const provider = {
      createSearchLink: vi.fn(() => {
        throw new Error("provider unavailable");
      })
    } satisfies MapsProvider;

    expect(getActivityMapUrl(activity, provider)).toBeNull();
    expect(enrichActivityWithMapLink(activity, provider)).toEqual(activity);
  });
});
