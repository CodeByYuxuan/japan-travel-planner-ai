import { describe, expect, test, vi } from "vitest";

import {
  HotelProviderConfigurationError,
  HotelProviderError
} from "./hotelProvider.js";
import {
  buildRakutenSimpleHotelSearchUrl,
  createRakutenHotelProvider,
  normalizeRakutenHotelResponse
} from "./rakutenHotelProvider.js";

const hotelRequest = {
  budget: "budget" as const,
  city: "Tokyo",
  endDate: "2026-04-08",
  latitude: 35.6812,
  longitude: 139.7671,
  maxResults: 3,
  radiusKm: 1.5,
  startDate: "2026-04-06"
};

const rakutenSuccessBody = {
  hotels: [
    {
      hotel: [
        {
          hotelBasicInfo: {
            access: "3 minutes walk from Tokyo Station.",
            address1: "Tokyo",
            address2: "Chiyoda City Marunouchi 1-1-1",
            areaName: "Tokyo",
            hotelImageUrl: "https://img.travel.rakuten.co.jp/hotel.jpg",
            hotelInformationUrl: "https://travel.rakuten.co.jp/hotel-info",
            hotelMinCharge: 18000,
            hotelName: "Tokyo Station Stay",
            hotelNo: 123456,
            hotelSpecial: "A convenient base for rail-friendly Tokyo days.",
            hotelThumbnailUrl: "https://img.travel.rakuten.co.jp/thumb.jpg",
            latitude: 35.6812,
            longitude: 139.7671,
            nearestStation: "Tokyo",
            planListUrl: "https://travel.rakuten.co.jp/plan-list",
            reviewAverage: "4.5",
            reviewCount: "321",
            userReview: "Helpful staff and quiet rooms."
          }
        },
        {
          hotelRatingInfo: {
            locationAverage: "4.7",
            serviceAverage: "4.4"
          }
        },
        {
          hotelFacilitiesInfo: {
            hotelFacilities: [{ item: "Wi-Fi" }, { item: "Large bath" }]
          }
        }
      ]
    }
  ],
  pagingInfo: {
    recordCount: 1
  }
};

describe("buildRakutenSimpleHotelSearchUrl", () => {
  test("builds the current SimpleHotelSearch endpoint with app ID and normalized parameters", () => {
    const url = buildRakutenSimpleHotelSearchUrl({
      appId: "rakuten-app-id",
      input: hotelRequest
    });

    expect(url?.origin).toBe("https://openapi.rakuten.co.jp");
    expect(url?.pathname).toBe("/engine/api/Travel/SimpleHotelSearch/20170426");
    expect(url?.searchParams.get("applicationId")).toBe("rakuten-app-id");
    expect(url?.searchParams.get("format")).toBe("json");
    expect(url?.searchParams.get("formatVersion")).toBe("2");
    expect(url?.searchParams.get("datumType")).toBe("1");
    expect(url?.searchParams.get("latitude")).toBe("35.6812");
    expect(url?.searchParams.get("longitude")).toBe("139.7671");
    expect(url?.searchParams.get("searchRadius")).toBe("1.5");
    expect(url?.searchParams.get("hits")).toBe("3");
    expect(url?.searchParams.get("sort")).toBe("+roomCharge");
  });

  test("falls back to known city coordinates for city-only requests", () => {
    const url = buildRakutenSimpleHotelSearchUrl({
      appId: "rakuten-app-id",
      input: {
        city: "Kyoto",
        endDate: "2026-04-08",
        startDate: "2026-04-06"
      }
    });

    expect(url?.searchParams.get("latitude")).toBe("35.0116");
    expect(url?.searchParams.get("longitude")).toBe("135.7681");
  });

  test("returns null when SimpleHotelSearch cannot be called for the city", () => {
    const url = buildRakutenSimpleHotelSearchUrl({
      appId: "rakuten-app-id",
      input: {
        city: "Unknown City",
        endDate: "2026-04-08",
        startDate: "2026-04-06"
      }
    });

    expect(url).toBeNull();
  });
});

describe("normalizeRakutenHotelResponse", () => {
  test("normalizes Rakuten hotel response fields without exposing raw auth data", () => {
    const hotels = normalizeRakutenHotelResponse(
      {
        ...rakutenSuccessBody,
        accessKey: "do-not-leak",
        applicationId: "do-not-leak"
      },
      hotelRequest
    );

    expect(hotels).toEqual([
      expect.objectContaining({
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
        mapUrl:
          "https://www.google.com/maps/search/?api=1&query=35.6812%2C139.7671",
        name: "Tokyo Station Stay",
        priceFrom: 18000,
        provider: "rakuten-travel",
        rating: 4.5,
        reviewCount: 321,
        tags: ["Near Tokyo Station", "Location 4.7", "Service 4.4"],
        thumbnailUrl: "https://img.travel.rakuten.co.jp/thumb.jpg"
      })
    ]);
    expect(JSON.stringify(hotels)).not.toContain("do-not-leak");
    expect(JSON.stringify(hotels)).not.toContain("accessKey");
    expect(JSON.stringify(hotels)).not.toContain("applicationId");
  });

  test("returns an empty list when Rakuten has no results", () => {
    expect(
      normalizeRakutenHotelResponse(
        {
          hotels: []
        },
        hotelRequest
      )
    ).toEqual([]);
  });

  test("maps invalid provider response shape to a provider error", () => {
    expect(() =>
      normalizeRakutenHotelResponse(
        {
          hotels: "not-an-array"
        },
        hotelRequest
      )
    ).toThrow(HotelProviderError);
  });
});

describe("createRakutenHotelProvider", () => {
  test("calls Rakuten with access key header and returns normalized hotels", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_url, _init) => {
      void _url;
      void _init;

      return new Response(JSON.stringify(rakutenSuccessBody), {
        headers: {
          "Content-Type": "application/json"
        },
        status: 200
      });
    });
    const provider = createRakutenHotelProvider({
      accessKey: "rakuten-access-key",
      appId: "rakuten-app-id",
      fetch: fetchMock
    });

    await expect(provider.searchHotels(hotelRequest)).resolves.toEqual([
      expect.objectContaining({
        id: "rakuten-travel:123456",
        name: "Tokyo Station Stay"
      })
    ]);

    const firstCall = fetchMock.mock.calls[0];

    if (!firstCall) {
      throw new Error("Expected Rakuten fetch to be called.");
    }

    const [url, init] = firstCall;

    expect(String(url)).toContain(
      "https://openapi.rakuten.co.jp/engine/api/Travel/SimpleHotelSearch/20170426"
    );
    expect(new Headers(init?.headers).get("accessKey")).toBe(
      "rakuten-access-key"
    );
  });

  test("does not require Rakuten config until hotel search is requested", async () => {
    const provider = createRakutenHotelProvider();

    await expect(provider.searchHotels(hotelRequest)).rejects.toBeInstanceOf(
      HotelProviderConfigurationError
    );
  });

  test("maps provider network failure to a safe provider error", async () => {
    const provider = createRakutenHotelProvider({
      accessKey: "rakuten-access-key",
      appId: "rakuten-app-id",
      fetch: vi.fn(async () => {
        throw new Error("network secret details");
      })
    });

    await expect(provider.searchHotels(hotelRequest)).rejects.toBeInstanceOf(
      HotelProviderError
    );
  });
});
