import { describe, expect, test } from "vitest";

import {
  buildGoogleMapsSearchQuery,
  createGoogleMapsSearchLink,
  createGoogleMapsSearchUrl
} from "./mapsProvider.js";

describe("Google Maps search link provider", () => {
  test("generates a search URL from activity title and location", () => {
    expect(
      createGoogleMapsSearchLink({
        title: "Senso-ji morning visit",
        location: {
          name: "Senso-ji",
          city: "Tokyo"
        }
      })
    ).toBe(
      "https://www.google.com/maps/search/?api=1&query=Senso-ji%20morning%20visit%20Senso-ji%20Tokyo"
    );
  });

  test("generates a search URL from location only", () => {
    expect(
      createGoogleMapsSearchLink({
        location: {
          address: "2 Chome-3-1 Asakusa",
          city: "Tokyo"
        }
      })
    ).toBe(
      "https://www.google.com/maps/search/?api=1&query=2%20Chome-3-1%20Asakusa%20Tokyo"
    );
  });

  test("encodes special characters and Japanese text safely", () => {
    const query = "金閣寺 & 龍安寺 Kyoto";

    expect(createGoogleMapsSearchUrl(query)).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        query
      )}`
    );
  });

  test("uses coordinates when exact latitude and longitude are available", () => {
    expect(
      buildGoogleMapsSearchQuery({
        title: "Senso-ji morning visit",
        location: {
          latitude: 35.7148,
          longitude: 139.7967,
          name: "Senso-ji"
        }
      })
    ).toBe("35.7148,139.7967");
  });

  test("returns null for missing or empty location text", () => {
    expect(
      createGoogleMapsSearchLink({
        title: "A title without location",
        location: {
          name: " "
        }
      })
    ).toBeNull();
    expect(createGoogleMapsSearchLink({ title: "Only a title" })).toBeNull();
  });
});
