import { describe, expect, test, vi } from "vitest";

import {
  RouteProviderConfigurationError,
  RouteProviderError
} from "./routeProvider.js";
import {
  buildGoogleRoutesRequestBody,
  createGoogleRoutesProvider,
  createGoogleMapsDirectionsUrl,
  normalizeGoogleRoutesResponse
} from "./googleRoutesProvider.js";

const routeRequest = {
  destination: {
    address: "4 Chome Ueno, Taito City, Tokyo",
    label: "Ameyoko lunch crawl"
  },
  locale: "en-US",
  maxAlternatives: 2,
  origin: {
    label: "Morning walk through Ueno Park",
    latitude: 35.7156,
    longitude: 139.7745
  },
  travelMode: "transit" as const
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json"
    },
    status
  });
}

function getFirstFetchCall(fetchMock: typeof fetch) {
  const firstCall = vi.mocked(fetchMock).mock.calls[0];

  if (!firstCall) {
    throw new Error("Expected fetch to be called.");
  }

  return firstCall;
}

const googleRoutesSuccessBody = {
  routes: [
    {
      distanceMeters: 1200,
      duration: "840s",
      staticDuration: "780s",
      legs: [
        {
          distanceMeters: 1200,
          duration: "840s",
          staticDuration: "780s",
          steps: [
            {
              distanceMeters: 400,
              navigationInstruction: {
                instructions: "Walk to Ueno Station."
              },
              staticDuration: "300s",
              travelMode: "WALK"
            },
            {
              distanceMeters: 800,
              navigationInstruction: {
                instructions: "Take the Ginza Line toward Asakusa."
              },
              staticDuration: "480s",
              transitDetails: {
                transitLine: {
                  name: "Tokyo Metro Ginza Line",
                  shortName: "G"
                }
              },
              travelMode: "TRANSIT"
            }
          ]
        }
      ],
      rawAuthorization: "do-not-leak",
      rawApiKey: "do-not-leak"
    }
  ],
  requestHeaders: {
    "X-Goog-Api-Key": "do-not-leak"
  }
};

describe("buildGoogleRoutesRequestBody", () => {
  test("builds the minimal Compute Routes request body", () => {
    expect(buildGoogleRoutesRequestBody(routeRequest)).toEqual({
      computeAlternativeRoutes: true,
      destination: {
        address: "4 Chome Ueno, Taito City, Tokyo"
      },
      languageCode: "en-US",
      origin: {
        location: {
          latLng: {
            latitude: 35.7156,
            longitude: 139.7745
          }
        }
      },
      travelMode: "TRANSIT"
    });
  });

  test("creates a Google Maps directions URL without an API key", () => {
    const url = new URL(createGoogleMapsDirectionsUrl(routeRequest));

    expect(url.origin).toBe("https://www.google.com");
    expect(url.pathname).toBe("/maps/dir/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("origin")).toBe("35.7156,139.7745");
    expect(url.searchParams.get("destination")).toBe(
      "4 Chome Ueno, Taito City, Tokyo"
    );
    expect(url.searchParams.get("travelmode")).toBe("transit");
    expect(url.search).not.toContain("key");
  });
});

describe("createGoogleRoutesProvider", () => {
  test("calls Compute Routes with required auth and field-mask headers", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({ routes: [] })
    );
    const provider = createGoogleRoutesProvider({
      apiKey: "google-routes-test-key",
      baseUrl: "https://routes.example.test/directions/v2:computeRoutes",
      fetch: fetchMock,
      fieldMask: "routes.duration,routes.distanceMeters"
    });

    await expect(provider.getRouteHints(routeRequest)).resolves.toEqual([]);

    const [url, init] = getFirstFetchCall(fetchMock);
    const headers = new Headers(init?.headers);

    expect(url).toBe("https://routes.example.test/directions/v2:computeRoutes");
    expect(init?.method).toBe("POST");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-Goog-Api-Key")).toBe("google-routes-test-key");
    expect(headers.get("X-Goog-FieldMask")).toBe(
      "routes.duration,routes.distanceMeters"
    );
    expect(JSON.parse(String(init?.body))).toMatchObject({
      destination: {
        address: "4 Chome Ueno, Taito City, Tokyo"
      },
      origin: {
        location: {
          latLng: {
            latitude: 35.7156,
            longitude: 139.7745
          }
        }
      },
      travelMode: "TRANSIT"
    });
  });

  test("does not require Google config until route hints are requested", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({ routes: [] })
    );
    const provider = createGoogleRoutesProvider({
      fetch: fetchMock
    });

    await expect(provider.getRouteHints(routeRequest)).rejects.toBeInstanceOf(
      RouteProviderConfigurationError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("maps provider network and HTTP failures to a safe provider error", async () => {
    const networkProvider = createGoogleRoutesProvider({
      apiKey: "google-routes-test-key",
      fetch: vi.fn(async () => {
        throw new Error("network secret details");
      })
    });
    const httpProvider = createGoogleRoutesProvider({
      apiKey: "google-routes-test-key",
      fetch: vi.fn<typeof fetch>(async () =>
        jsonResponse({ error: { message: "raw provider detail" } }, 500)
      )
    });

    await expect(
      networkProvider.getRouteHints(routeRequest)
    ).rejects.toBeInstanceOf(RouteProviderError);
    await expect(
      httpProvider.getRouteHints(routeRequest)
    ).rejects.toBeInstanceOf(RouteProviderError);
  });

  test("returns an empty route hint list when Google returns no routes", async () => {
    const provider = createGoogleRoutesProvider({
      apiKey: "google-routes-test-key",
      fetch: vi.fn<typeof fetch>(async () => jsonResponse({ routes: [] }))
    });

    await expect(provider.getRouteHints(routeRequest)).resolves.toEqual([]);
  });

  test("normalizes Google route responses into provider-neutral hints", () => {
    const hints = normalizeGoogleRoutesResponse(
      googleRoutesSuccessBody,
      routeRequest,
      new Date("2026-06-25T00:00:00.000Z")
    );

    expect(hints).toEqual([
      {
        destination: routeRequest.destination,
        destinationLabel: "Ameyoko lunch crawl",
        distanceMeters: 1200,
        durationMinutes: 14,
        id: "google-routes:morning-walk-through-ueno-park-ameyoko-lunch-crawl-transit:1",
        mapUrl: expect.stringContaining("https://www.google.com/maps/dir/"),
        origin: routeRequest.origin,
        originLabel: "Morning walk through Ueno Park",
        provider: "google-routes",
        sourceUpdatedAt: "2026-06-25T00:00:00.000Z",
        staticDurationMinutes: 13,
        steps: [
          {
            distanceMeters: 400,
            durationMinutes: 5,
            instruction: "Walk to Ueno Station.",
            transitLineName: null,
            travelMode: "walk"
          },
          {
            distanceMeters: 800,
            durationMinutes: 8,
            instruction: "Take the Ginza Line toward Asakusa.",
            transitLineName: "Tokyo Metro Ginza Line",
            travelMode: "transit"
          }
        ],
        summary:
          "Transit route from Morning walk through Ueno Park to Ameyoko lunch crawl, about 14 min, 1.2 km, via Tokyo Metro Ginza Line.",
        transitLineNames: ["Tokyo Metro Ginza Line"],
        travelMode: "transit",
        warnings: []
      }
    ]);
  });

  test("adds local-verification warnings for beta walking and bicycle modes", () => {
    const hints = normalizeGoogleRoutesResponse(
      { routes: [{ duration: "600s" }] },
      {
        ...routeRequest,
        maxAlternatives: 1,
        travelMode: "walk"
      },
      new Date("2026-06-25T00:00:00.000Z")
    );

    expect(hints[0]?.warnings).toEqual([
      "Walking and bicycle route details may be incomplete; verify locally before traveling."
    ]);
  });

  test("does not expose raw provider secret or auth fields", () => {
    const hints = normalizeGoogleRoutesResponse(
      googleRoutesSuccessBody,
      routeRequest,
      new Date("2026-06-25T00:00:00.000Z")
    );

    expect(JSON.stringify(hints)).not.toContain("do-not-leak");
    expect(JSON.stringify(hints)).not.toContain("rawAuthorization");
    expect(JSON.stringify(hints)).not.toContain("X-Goog-Api-Key");
  });
});
