import { describe, expect, test, vi } from "vitest";

import {
  type HotelProvider,
  HotelProviderConfigurationError,
  HotelProviderError
} from "./hotelProvider.js";

describe("HotelProvider contract", () => {
  test("uses normalized hotel suggestions independent of provider response shape", async () => {
    const provider = {
      name: "contract-test-provider",
      searchHotels: vi.fn<HotelProvider["searchHotels"]>(async () => [
        {
          access: "3 minutes from Tokyo Station",
          address: "1 Marunouchi, Chiyoda City, Tokyo",
          amenities: ["Wi-Fi"],
          bookingUrl: "https://example.com/hotel",
          city: "Tokyo",
          currency: "JPY",
          description: "Central hotel for rail-friendly days.",
          id: "contract-test-provider:hotel-1",
          imageUrl: "https://example.com/hotel.jpg",
          latitude: 35.6812,
          longitude: 139.7671,
          mapUrl: "https://www.google.com/maps/search/?api=1&query=Tokyo",
          name: "Tokyo Station Hotel",
          priceFrom: 18000,
          provider: "contract-test-provider",
          rating: 4.6,
          reviewCount: 1200,
          sourceUpdatedAt: null,
          tags: ["Near Tokyo Station"],
          thumbnailUrl: "https://example.com/hotel-thumb.jpg"
        }
      ])
    } satisfies HotelProvider;

    await expect(
      provider.searchHotels({
        city: "Tokyo",
        endDate: "2026-04-08",
        startDate: "2026-04-06"
      })
    ).resolves.toEqual([
      expect.objectContaining({
        id: "contract-test-provider:hotel-1",
        name: "Tokyo Station Hotel",
        provider: "contract-test-provider"
      })
    ]);
  });

  test("provides explicit error types for configuration and provider failures", () => {
    expect(new HotelProviderConfigurationError()).toMatchObject({
      name: "HotelProviderConfigurationError",
      message: "Hotel provider is not configured."
    });
    expect(new HotelProviderError()).toMatchObject({
      name: "HotelProviderError",
      message: "Hotel provider request failed."
    });
  });
});
