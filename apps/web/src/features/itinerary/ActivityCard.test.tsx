import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import type { Activity } from "../../../../../packages/shared/src/schemas/itinerary.js";
import { ActivityCard } from "./ActivityCard.js";

const activity = {
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
} satisfies Activity;

describe("ActivityCard map links", () => {
  test("renders an external Google Maps link when location text is available", () => {
    const html = renderToString(<ActivityCard activity={activity} />);

    expect(html).toContain("Open in Google Maps");
    expect(html).toContain(
      "https://www.google.com/maps/search/?api=1&amp;query=Senso-ji%20morning%20visit%20Senso-ji%20Tokyo"
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
  });

  test("preserves existing activity map links", () => {
    const existingMapUrl = "https://www.google.com/maps/place/Senso-ji";
    const html = renderToString(
      <ActivityCard
        activity={{
          ...activity,
          location: {
            ...activity.location,
            mapUrl: existingMapUrl
          }
        }}
      />
    );

    expect(html).toContain(existingMapUrl);
  });

  test("does not render a map link when location text is unavailable", () => {
    const html = renderToString(
      <ActivityCard
        activity={{
          ...activity,
          location: {
            name: " "
          }
        }}
      />
    );

    expect(html).not.toContain("Open in Google Maps");
    expect(html).not.toContain("https://www.google.com/maps/search/");
  });
});
