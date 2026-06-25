import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { HotelSuggestions } from "./HotelSuggestions.js";

const suggestion = {
  access: "3 minutes walk from Tokyo Station.",
  address: "Tokyo Chiyoda City Marunouchi 1-1-1",
  amenities: ["Wi-Fi", "Large bath"],
  bookingUrl: "https://travel.rakuten.co.jp/plan-list",
  city: "Tokyo",
  currency: "JPY",
  description: "A convenient base for rail-friendly Tokyo days.",
  id: "rakuten-travel:123456",
  imageUrl: "https://img.travel.rakuten.co.jp/hotel.jpg",
  latitude: 35.6812,
  longitude: 139.7671,
  mapUrl: "https://www.google.com/maps/search/?api=1&query=35.6812%2C139.7671",
  name: "Tokyo Station Stay",
  priceFrom: 18000,
  provider: "rakuten-travel",
  rating: 4.5,
  reviewCount: 321,
  sourceUpdatedAt: null,
  tags: ["Near Tokyo Station", "Location 4.7"],
  thumbnailUrl: "https://img.travel.rakuten.co.jp/thumb.jpg"
};

describe("HotelSuggestions", () => {
  test("renders normalized hotel suggestions", () => {
    const html = renderToString(
      <HotelSuggestions
        onLoadSuggestions={() => undefined}
        status="available"
        suggestions={[suggestion]}
        targetCity="Tokyo"
      />
    );

    expect(html).toContain("Hotel suggestions");
    expect(html).toContain("Rakuten Travel");
    expect(html).toContain("Tokyo Station Stay");
    expect(html).toContain("A convenient base for rail-friendly Tokyo days.");
    expect(html).toContain("¥18,000");
    expect(html).toContain("4.5");
    expect(html).toContain("321");
    expect(html).toContain("Booking page");
    expect(html).toContain("Map");
  });

  test("renders an empty state", () => {
    const html = renderToString(
      <HotelSuggestions
        onLoadSuggestions={() => undefined}
        status="empty"
        targetCity="Kyoto"
      />
    );

    expect(html).toContain("No hotel suggestions found for Kyoto.");
    expect(html).toContain("Find hotels");
  });

  test("renders unavailable and error states as recoverable alerts", () => {
    const unavailableHtml = renderToString(
      <HotelSuggestions
        onLoadSuggestions={() => undefined}
        status="unavailable"
      />
    );
    const errorHtml = renderToString(
      <HotelSuggestions
        errorMessage="Hotel enrichment is not configured."
        onLoadSuggestions={() => undefined}
        status="error"
      />
    );

    expect(unavailableHtml).toContain(
      "Hotel suggestions are temporarily unavailable."
    );
    expect(unavailableHtml).toContain('role="alert"');
    expect(errorHtml).toContain("Hotel enrichment is not configured.");
    expect(errorHtml).toContain('role="alert"');
  });

  test("explains why hotel search is disabled before an itinerary exists", () => {
    const html = renderToString(
      <HotelSuggestions disabledReason="Create an itinerary before searching hotels." />
    );

    expect(html).toContain("Create an itinerary before searching hotels.");
    expect(html).toContain("disabled");
  });

  test("renders loading state", () => {
    const html = renderToString(
      <HotelSuggestions
        onLoadSuggestions={() => undefined}
        status="loading"
        targetCity="Tokyo"
      />
    );

    expect(html).toContain("Searching hotels");
    expect(html).toContain("disabled");
  });
});
