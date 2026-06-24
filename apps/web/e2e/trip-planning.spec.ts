import { expect, test, type Page, type Route } from "@playwright/test";

const corsHeaders = {
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
  "access-control-allow-origin": "http://127.0.0.1:5173"
};

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
  options: { failFirstSave?: boolean } = {}
) {
  let savedTrip: ReturnType<typeof createTripRecordFromPayload> | null = null;
  let saveAttempts = 0;
  let lastSavedPayload: TripWritePayload | null = null;

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

    expect(route.request().method()).toBe("GET");
    await route.fulfill({
      contentType: "application/json",
      headers: corsHeaders,
      json: {
        trip: savedTrip
      },
      status: savedTrip ? 200 : 404
    });
  });

  return {
    getLastSavedPayload: () => lastSavedPayload,
    getSaveAttempts: () => saveAttempts
  };
}

test("traveler can plan and edit a mock itinerary", async ({ page }) => {
  await page.goto("/");

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
});

test("traveler can generate and edit an itinerary from a mocked AI API response", async ({
  page
}) => {
  await routeGeneratedItinerary(page);

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
    page.getByRole("button", { name: "Save itinerary" })
  ).toBeEnabled();

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
  expect(persistence.getSaveAttempts()).toBe(1);

  await page.getByRole("button", { name: "Save itinerary" }).click();
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
});
