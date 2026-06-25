import { expect, test, type Page, type Route } from "@playwright/test";

const corsHeaders = {
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "access-control-allow-origin": "http://127.0.0.1:5173"
};

const publicShareToken = "public-share-token-1234567890abcdef";
const pdfBody = "%PDF-1.4\nMock itinerary PDF";
const hotelSuggestionsFixture = [
  {
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
    sourceUpdatedAt: null,
    tags: ["Near Tokyo Station"],
    thumbnailUrl: "https://img.travel.rakuten.co.jp/thumb.jpg"
  }
];

const generatedItineraryFixture = {
  title: "AI Generated Tokyo And Kyoto Route",
  startDate: "2026-04-06",
  endDate: "2026-04-07",
  days: [
    {
      date: "2026-04-06",
      city: "Tokyo",
      summary: "Generated Tokyo day with temples and local food.",
      activities: [
        {
          id: "generated-sensoji",
          title: "Generated Senso-ji morning",
          category: "culture",
          timing: {
            startTime: "09:00",
            endTime: "11:00",
            timeOfDay: "morning"
          },
          durationMinutes: 120,
          location: {
            name: "Senso-ji",
            city: "Tokyo"
          },
          costLevel: "free",
          notes: "Generated note with flexible temple timing."
        },
        {
          id: "generated-lunch",
          title: "Generated Asakusa lunch",
          category: "food",
          timing: {
            startTime: "12:00",
            endTime: "13:00",
            timeOfDay: "afternoon"
          },
          durationMinutes: 60,
          location: {
            name: "Asakusa",
            city: "Tokyo"
          },
          costLevel: "medium",
          notes: "Generated lunch stop with vegetarian-friendly options."
        }
      ]
    },
    {
      date: "2026-04-07",
      city: "Kyoto",
      summary: "Generated Kyoto transfer day.",
      activities: [
        {
          id: "generated-transfer",
          title: "Generated Shinkansen transfer",
          category: "transit",
          timing: {
            startTime: "08:30",
            endTime: "10:50",
            timeOfDay: "morning"
          },
          durationMinutes: 140,
          location: {
            name: "Tokyo Station to Kyoto Station",
            city: "Tokyo"
          },
          costLevel: "high",
          notes: "Generated transfer note with station buffer."
        }
      ]
    }
  ]
};

type TripWritePayload = typeof generatedItineraryFixture & {
  budget: string;
  cities: string[];
  constraints: string[];
  interests: string[];
  pace: string;
};

function isOptionsRequest(route: Route) {
  return route.request().method() === "OPTIONS";
}

async function fulfillOptions(route: Route) {
  await route.fulfill({
    headers: corsHeaders,
    status: 204
  });
}

async function routeGeneratedItinerary(page: Page) {
  await page.route("**/api/itineraries/generate", async (route) => {
    if (isOptionsRequest(route)) {
      await fulfillOptions(route);
      return;
    }

    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toMatchObject({
      cities: ["Tokyo", "Kyoto"],
      pace: "balanced"
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    await route.fulfill({
      contentType: "application/json",
      headers: corsHeaders,
      json: {
        itinerary: generatedItineraryFixture,
        metadata: {
          attempts: 1,
          estimatedCostUsd: null,
          model: "gpt-test-model",
          repaired: false,
          tokenUsage: null
        }
      },
      status: 200
    });
  });
}

async function routeHotelSuggestions(page: Page) {
  let hotelSuggestionRequests = 0;

  await page.route("**/api/enrichment/hotels/suggestions", async (route) => {
    if (isOptionsRequest(route)) {
      await fulfillOptions(route);
      return;
    }

    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toMatchObject({
      budget: "moderate",
      city: "Tokyo",
      startDate: "2026-04-06"
    });
    hotelSuggestionRequests += 1;

    await route.fulfill({
      contentType: "application/json",
      headers: corsHeaders,
      json: {
        hotelSuggestions: hotelSuggestionsFixture,
        status: "available"
      },
      status: 200
    });
  });

  return {
    getHotelSuggestionRequests: () => hotelSuggestionRequests
  };
}

async function fillGeneratedTripRequest(page: Page) {
  await page.getByLabel("Start date").fill("2026-04-06");
  await page.getByLabel("End date").fill("2026-04-07");
  await page.getByLabel("Cities").fill("Tokyo, Kyoto");
  await page.getByLabel("Interests").fill("temples, local food");
  await page.getByLabel("Travel pace").selectOption("balanced");
  await page.getByLabel("Budget").selectOption("moderate");
  await page.getByLabel("Constraints").fill("Vegetarian meals only.");
}

function createTripRecordFromPayload(payload: TripWritePayload) {
  return {
    id: "generated-trip-1",
    title: payload.title,
    startDate: payload.startDate,
    endDate: payload.endDate,
    cities: payload.cities,
    interests: payload.interests,
    pace: payload.pace,
    budget: payload.budget,
    constraints: payload.constraints,
    days: payload.days.map((day, dayIndex) => ({
      id: `saved-day-${dayIndex + 1}`,
      ...day,
      activities: day.activities.map((activity, activityIndex) => ({
        ...activity,
        id: activity.id ?? `saved-activity-${dayIndex + 1}-${activityIndex + 1}`
      }))
    })),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

async function routeTripPersistence(
  page: Page,
  options: { failFirstPrivateExport?: boolean; failFirstSave?: boolean } = {}
) {
  let savedTrip: ReturnType<typeof createTripRecordFromPayload> | null = null;
  let shareCreatedForTripId: string | null = null;
  let privatePdfExportRequests = 0;
  let sharedPdfExportRequests = 0;
  let saveAttempts = 0;
  let lastSavedPayload: TripWritePayload | null = null;
  let lastUpdatedPayload: TripWritePayload | null = null;

  await page.route("**/api/trips", async (route) => {
    if (isOptionsRequest(route)) {
      await fulfillOptions(route);
      return;
    }

    if (route.request().method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        headers: corsHeaders,
        json: {
          trips: savedTrip ? [savedTrip] : []
        },
        status: 200
      });
      return;
    }

    expect(route.request().method()).toBe("POST");
    saveAttempts += 1;

    if (options.failFirstSave === true && saveAttempts === 1) {
      await route.fulfill({
        contentType: "application/json",
        headers: corsHeaders,
        json: {
          error: {
            code: "TRIP_SAVE_FAILED",
            message: "Trip storage is temporarily unavailable."
          }
        },
        status: 503
      });
      return;
    }

    lastSavedPayload = route.request().postDataJSON() as TripWritePayload;
    savedTrip = createTripRecordFromPayload(lastSavedPayload);

    await route.fulfill({
      contentType: "application/json",
      headers: corsHeaders,
      json: {
        trip: savedTrip
      },
      status: 201
    });
  });

  await page.route("**/api/trips/generated-trip-1", async (route) => {
    if (isOptionsRequest(route)) {
      await fulfillOptions(route);
      return;
    }

    if (route.request().method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        headers: corsHeaders,
        json: {
          trip: savedTrip
        },
        status: savedTrip ? 200 : 404
      });
      return;
    }

    expect(route.request().method()).toBe("PATCH");
    saveAttempts += 1;
    lastUpdatedPayload = route.request().postDataJSON() as TripWritePayload;
    savedTrip = createTripRecordFromPayload(lastUpdatedPayload);

    await route.fulfill({
      contentType: "application/json",
      headers: corsHeaders,
      json: {
        trip: savedTrip
      },
      status: 200
    });
  });

  await page.route(
    "**/api/trips/generated-trip-1/export/pdf",
    async (route) => {
      if (isOptionsRequest(route)) {
        await fulfillOptions(route);
        return;
      }

      expect(route.request().method()).toBe("GET");
      privatePdfExportRequests += 1;

      if (
        options.failFirstPrivateExport === true &&
        privatePdfExportRequests === 1
      ) {
        await route.fulfill({
          contentType: "application/json",
          headers: corsHeaders,
          json: {
            error: {
              code: "PDF_EXPORT_FAILED",
              message: "PDF export could not be generated."
            }
          },
          status: 500
        });
        return;
      }

      await route.fulfill({
        body: pdfBody,
        contentType: "application/pdf",
        headers: {
          ...corsHeaders,
          "cache-control": "no-store",
          "content-disposition":
            'attachment; filename="ai-generated-tokyo-and-kyoto-route.pdf"'
        },
        status: 200
      });
    }
  );

  await page.route("**/api/trips/generated-trip-1/share", async (route) => {
    if (isOptionsRequest(route)) {
      await fulfillOptions(route);
      return;
    }

    expect(route.request().method()).toBe("POST");
    shareCreatedForTripId = "generated-trip-1";

    await route.fulfill({
      contentType: "application/json",
      headers: corsHeaders,
      json: {
        share: {
          token: publicShareToken,
          permission: "read_only",
          expiresAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      },
      status: 201
    });
  });

  await page.route(
    `**/api/share/${publicShareToken}/export/pdf`,
    async (route) => {
      if (isOptionsRequest(route)) {
        await fulfillOptions(route);
        return;
      }

      expect(route.request().method()).toBe("GET");
      sharedPdfExportRequests += 1;

      await route.fulfill({
        body: pdfBody,
        contentType: "application/pdf",
        headers: {
          ...corsHeaders,
          "cache-control": "no-store",
          "content-disposition":
            'attachment; filename="ai-generated-tokyo-and-kyoto-route.pdf"'
        },
        status: 200
      });
    }
  );

  await page.route("**/api/share/*", async (route) => {
    if (isOptionsRequest(route)) {
      await fulfillOptions(route);
      return;
    }

    expect(route.request().method()).toBe("GET");

    if (
      route.request().url().endsWith(`/api/share/${publicShareToken}`) &&
      savedTrip &&
      shareCreatedForTripId === savedTrip.id
    ) {
      await route.fulfill({
        contentType: "application/json",
        headers: corsHeaders,
        json: {
          share: {
            token: publicShareToken,
            permission: "read_only",
            expiresAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
          },
          trip: savedTrip
        },
        status: 200
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      headers: corsHeaders,
      json: {
        error: {
          code: "SHARE_LINK_NOT_FOUND",
          message: "Share link was not found."
        }
      },
      status: 404
    });
  });

  return {
    getLastSavedPayload: () => lastSavedPayload,
    getLastUpdatedPayload: () => lastUpdatedPayload,
    getPrivatePdfExportRequests: () => privatePdfExportRequests,
    getShareCreatedForTripId: () => shareCreatedForTripId,
    getSharedPdfExportRequests: () => sharedPdfExportRequests,
    getSaveAttempts: () => saveAttempts
  };
}

test("traveler can plan and edit a mock itinerary", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Mock" }).click();

  await expect(
    page.getByRole("heading", { name: "No itinerary yet" })
  ).toBeVisible();

  await page.getByLabel("Start date").fill("2026-04-06");
  await page.getByLabel("End date").fill("2026-04-08");
  await page.getByLabel("Cities").fill("Tokyo, Kyoto");
  await page
    .getByLabel("Interests")
    .fill("spring flowers, temples, local food");
  await page.getByLabel("Travel pace").selectOption("balanced");
  await page.getByLabel("Budget").selectOption("moderate");
  await page
    .getByLabel("Constraints")
    .fill("Prefer rail-friendly days and relaxed meals.");

  await page.getByRole("button", { name: "Generate mock itinerary" }).click();

  await expect(
    page.getByRole("heading", { name: "Preparing itinerary" })
  ).toBeVisible();
  await expect(
    page
      .getByLabel("Shell status")
      .getByText("Tokyo And Kyoto Spring Highlights")
  ).toBeVisible();

  const dayOne = page.getByRole("region", { name: "Day 1: Tokyo" });
  await expect(dayOne).toBeVisible();
  await expect(
    dayOne.getByRole("heading", { name: "Morning walk through Ueno Park" })
  ).toBeVisible();
  await expect(
    dayOne.getByRole("link", { name: "Open in Google Maps" }).first()
  ).toHaveAttribute(
    "href",
    "https://www.google.com/maps/search/?api=1&query=Ueno%20Park%20Tokyo"
  );
  await expect(
    dayOne.getByRole("link", { name: "Open in Google Maps" }).first()
  ).toHaveAttribute("target", "_blank");

  await page
    .getByRole("button", { name: "Edit Morning walk through Ueno Park" })
    .click();

  const dialog = page.getByRole("dialog", {
    name: "Edit Morning walk through Ueno Park"
  });
  await expect(dialog).toBeVisible();

  const editedTitle = "Morning walk through Ueno Park and Shinobazu Pond";
  await dialog.getByLabel("Title").fill(editedTitle);
  await dialog.getByRole("button", { name: "Save activity" }).click();

  await expect(
    dayOne.getByRole("heading", { name: editedTitle })
  ).toBeVisible();
  await expect(page.getByText("Unsaved local edits")).toBeVisible();

  await dayOne
    .getByRole("button", { name: `Move ${editedTitle} down` })
    .click();
  await expect(dayOne.getByRole("heading", { level: 4 })).toHaveText([
    "Ameyoko lunch crawl",
    editedTitle,
    "Senso-ji and Nakamise-dori",
    "Tokyo Skytree sunset viewpoint"
  ]);

  const dayTwo = page.getByRole("region", { name: "Day 2: Kyoto" });
  await expect(dayTwo.getByRole("heading", { level: 4 })).toHaveText([
    "Tokaido Shinkansen to Kyoto",
    "Kiyomizu-dera temple visit",
    "Nishiki Market snack break",
    "Gion and Shirakawa evening walk"
  ]);

  await page.getByRole("button", { name: "Revert local edits" }).click();
  await expect(page.getByText("Unsaved local edits")).toHaveCount(0);
  await expect(
    dayOne.getByRole("heading", { name: "Morning walk through Ueno Park" })
  ).toBeVisible();
  await expect(dayOne.getByRole("heading", { name: editedTitle })).toHaveCount(
    0
  );
});

test("traveler can generate and edit an itinerary from a mocked AI API response", async ({
  page
}) => {
  await routeGeneratedItinerary(page);
  const hotels = await routeHotelSuggestions(page);

  await page.goto("/");
  await page.getByRole("button", { name: "API" }).click();

  await fillGeneratedTripRequest(page);

  await page.getByRole("button", { name: "Generate AI itinerary" }).click();

  await expect(
    page.getByRole("heading", { name: "Preparing itinerary" })
  ).toBeVisible();
  await expect(
    page
      .getByLabel("Shell status")
      .getByText("AI Generated Tokyo And Kyoto Route")
  ).toBeVisible();

  const dayOne = page.getByRole("region", { name: "Day 1: Tokyo" });
  await expect(
    dayOne.getByRole("heading", { name: "Generated Senso-ji morning" })
  ).toBeVisible();
  await expect(
    dayOne.getByRole("link", { name: "Open in Google Maps" }).first()
  ).toHaveAttribute(
    "href",
    "https://www.google.com/maps/search/?api=1&query=Generated%20Senso-ji%20morning%20Senso-ji%20Tokyo"
  );
  await expect(
    page.getByRole("button", { name: "Save itinerary" })
  ).toBeEnabled();
  await page.getByRole("button", { name: "Find hotels" }).click();
  await expect(
    page.getByRole("heading", { name: "Tokyo Station Stay" })
  ).toBeVisible();
  await expect.poll(() => hotels.getHotelSuggestionRequests()).toBe(1);

  await page
    .getByRole("button", { name: "Edit Generated Senso-ji morning" })
    .click();

  const dialog = page.getByRole("dialog", {
    name: "Edit Generated Senso-ji morning"
  });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Title").fill("Edited generated Senso-ji morning");
  await dialog.getByRole("button", { name: "Save activity" }).click();

  await expect(
    dayOne.getByRole("heading", { name: "Edited generated Senso-ji morning" })
  ).toBeVisible();
  await expect(page.getByText("Unsaved local edits")).toBeVisible();
});

test("traveler can save, refresh, and reopen an edited generated itinerary", async ({
  page
}) => {
  await routeGeneratedItinerary(page);
  const persistence = await routeTripPersistence(page, {
    failFirstPrivateExport: true,
    failFirstSave: true
  });

  await page.goto("/");
  await page.getByRole("button", { name: "API" }).click();
  await fillGeneratedTripRequest(page);
  await page.getByRole("button", { name: "Generate AI itinerary" }).click();

  const dayOne = page.getByRole("region", { name: "Day 1: Tokyo" });
  await expect(
    dayOne.getByRole("heading", { name: "Generated Senso-ji morning" })
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Edit Generated Senso-ji morning" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Edit Generated Senso-ji morning"
  });
  await expect(dialog).toBeVisible();

  const savedEditedTitle = "Saved generated Senso-ji morning";
  await dialog.getByLabel("Title").fill(savedEditedTitle);
  await dialog.getByRole("button", { name: "Save activity" }).click();
  await expect(
    dayOne.getByRole("heading", { name: savedEditedTitle })
  ).toBeVisible();
  await expect(page.getByText("Unsaved local edits")).toBeVisible();

  await page.getByRole("button", { name: "Save itinerary" }).click();
  await expect(
    page
      .getByRole("alert")
      .getByText("Trip storage is temporarily unavailable.")
  ).toBeVisible();
  await expect(
    dayOne.getByRole("heading", { name: savedEditedTitle })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry save" })).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Revert local edits" })
  ).toBeEnabled();
  expect(persistence.getSaveAttempts()).toBe(1);

  await page.getByRole("button", { name: "Retry save" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page
      .getByRole("region", { name: "Save and reopen" })
      .getByRole("status")
      .getByText("Saved")
  ).toBeVisible();
  await expect(page.getByText("Unsaved local edits")).toHaveCount(0);

  const savedPayload = persistence.getLastSavedPayload();

  if (!savedPayload) {
    throw new Error("Expected the generated itinerary to be saved.");
  }

  expect(savedPayload).toMatchObject({
    budget: "moderate",
    cities: ["Tokyo", "Kyoto"],
    constraints: ["Vegetarian meals only."],
    interests: ["temples", "local food"],
    pace: "balanced",
    title: "AI Generated Tokyo And Kyoto Route"
  });
  expect(savedPayload.days[0]?.activities[0]?.title).toBe(savedEditedTitle);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "No itinerary yet" })
  ).toBeVisible();

  await page.getByRole("button", { name: "API" }).click();
  await page.getByRole("button", { name: "Refresh saved trips" }).click();
  await page.getByLabel("Saved trips").selectOption("generated-trip-1");
  await page.getByRole("button", { name: "Reopen trip" }).click();

  await expect(
    page
      .getByLabel("Shell status")
      .getByText("AI Generated Tokyo And Kyoto Route")
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Day 1: Tokyo" })
      .getByRole("heading", { name: savedEditedTitle })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Edit ${savedEditedTitle}` })
  ).toBeVisible();

  await page.getByRole("button", { name: `Edit ${savedEditedTitle}` }).click();
  const reopenedDialog = page.getByRole("dialog", {
    name: `Edit ${savedEditedTitle}`
  });
  await expect(reopenedDialog).toBeVisible();

  const patchedEditedTitle = "Patched generated Senso-ji afternoon";
  await reopenedDialog.getByLabel("Title").fill(patchedEditedTitle);
  await reopenedDialog.getByRole("button", { name: "Save activity" }).click();
  await expect(
    page
      .getByRole("region", { name: "Day 1: Tokyo" })
      .getByRole("heading", { name: patchedEditedTitle })
  ).toBeVisible();
  await page
    .getByRole("region", { name: "Day 1: Tokyo" })
    .getByRole("button", { name: `Move ${patchedEditedTitle} down` })
    .click();
  await expect(page.getByText("Unsaved local edits")).toBeVisible();

  await page.getByRole("button", { name: "Save itinerary" }).click();
  await expect(page.getByText("Unsaved local edits")).toHaveCount(0);

  const patchedPayload = persistence.getLastUpdatedPayload();

  if (!patchedPayload) {
    throw new Error("Expected reopened itinerary edits to be patched.");
  }

  expect(
    patchedPayload.days[0]?.activities.map((activity) => activity.title)
  ).toEqual(["Generated Asakusa lunch", patchedEditedTitle]);

  await page.reload();
  await page.getByRole("button", { name: "API" }).click();
  await page.getByRole("button", { name: "Refresh saved trips" }).click();
  await page.getByLabel("Saved trips").selectOption("generated-trip-1");
  await page.getByRole("button", { name: "Reopen trip" }).click();

  const reopenedDayOne = page.getByRole("region", { name: "Day 1: Tokyo" });
  await expect(reopenedDayOne.getByRole("heading", { level: 4 })).toHaveText([
    "Generated Asakusa lunch",
    patchedEditedTitle
  ]);

  await expect(page.getByRole("button", { name: "Export PDF" })).toBeEnabled();
  await page.getByRole("button", { name: "Export PDF" }).click();
  await expect(
    page.getByRole("alert").getByText("PDF export could not be generated.")
  ).toBeVisible();
  await page.getByRole("button", { name: "Export PDF" }).click();
  await expect.poll(() => persistence.getPrivatePdfExportRequests()).toBe(2);

  await page.getByRole("button", { name: "Create public link" }).click();
  expect(persistence.getShareCreatedForTripId()).toBe("generated-trip-1");

  const shareUrlInput = page.getByLabel("Share URL");
  await expect(shareUrlInput).toHaveValue(
    new RegExp(`/share/${publicShareToken}$`)
  );

  const shareUrl = await shareUrlInput.inputValue();
  await page.goto(new URL(shareUrl).pathname);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "AI Generated Tokyo And Kyoto Route"
    })
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Day 1: Tokyo" })
      .getByRole("heading", { name: "Generated Asakusa lunch" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open in Google Maps" }).first()
  ).toHaveAttribute(
    "href",
    "https://www.google.com/maps/search/?api=1&query=Generated%20Asakusa%20lunch%20Asakusa%20Tokyo"
  );
  await expect(
    page.getByRole("button", { name: "Export shared PDF" })
  ).toBeEnabled();
  await page.getByRole("button", { name: "Export shared PDF" }).click();
  await expect.poll(() => persistence.getSharedPdfExportRequests()).toBe(1);
  await expect(page.getByRole("button", { name: /Edit/ })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save itinerary" })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Revert local edits" })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Generate AI itinerary" })
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Save and reopen" })
  ).toHaveCount(0);

  await page.goto("/share/invalid-public-share-token-1234567890");
  await expect(
    page.getByRole("heading", { name: "Share link not available" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export shared PDF" })
  ).toHaveCount(0);
});
