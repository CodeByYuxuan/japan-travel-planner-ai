import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { mockItinerary } from "../../mocks/index.js";
import { ItineraryView } from "./ItineraryView.js";

describe("ItineraryView", () => {
  test("renders days in chronological order", () => {
    const reversedItinerary = {
      ...mockItinerary,
      days: [...mockItinerary.days].reverse()
    };

    const html = renderToString(
      <ItineraryView itinerary={reversedItinerary} />
    );

    expect(html.indexOf('id="trip-day-2026-04-06"')).toBeLessThan(
      html.indexOf('id="trip-day-2026-04-07"')
    );
    expect(html.indexOf('id="trip-day-2026-04-07"')).toBeLessThan(
      html.indexOf('id="trip-day-2026-04-08"')
    );
  });

  test("renders activity details", () => {
    const html = renderToString(<ItineraryView itinerary={mockItinerary} />);
    const normalizedHtml = html.replaceAll("<!-- -->", "");

    expect(normalizedHtml).toContain("Morning walk through Ueno Park");
    expect(normalizedHtml).toContain("09:00-10:30");
    expect(normalizedHtml).toContain("90 min");
    expect(normalizedHtml).toContain("Ueno Park");
    expect(normalizedHtml).toContain("Free");
    expect(normalizedHtml).toContain("Nature");
    expect(normalizedHtml).toContain("seasonal blossoms around Shinobazu Pond");
  });

  test("renders an empty state", () => {
    const html = renderToString(<ItineraryView itinerary={null} />);

    expect(html).toContain("No itinerary yet");
    expect(html).toContain("ready for generated or mock trip data");
  });

  test("renders a loading state", () => {
    const html = renderToString(
      <ItineraryView itinerary={mockItinerary} isLoading />
    );

    expect(html).toContain("Preparing itinerary");
    expect(html).toContain('aria-busy="true"');
  });
});
