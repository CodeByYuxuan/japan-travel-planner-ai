import { expect, test } from "@playwright/test";

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
  await page.route("**/api/itineraries/generate", async (route) => {
    const corsHeaders = {
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-origin": "http://127.0.0.1:5173"
    };

    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        headers: corsHeaders,
        status: 204
      });
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
        itinerary: {
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
                  notes:
                    "Generated lunch stop with vegetarian-friendly options."
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
        },
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

  await page.goto("/");
  await page.getByRole("button", { name: "API" }).click();

  await page.getByLabel("Start date").fill("2026-04-06");
  await page.getByLabel("End date").fill("2026-04-07");
  await page.getByLabel("Cities").fill("Tokyo, Kyoto");
  await page.getByLabel("Interests").fill("temples, local food");
  await page.getByLabel("Travel pace").selectOption("balanced");
  await page.getByLabel("Budget").selectOption("moderate");
  await page.getByLabel("Constraints").fill("Vegetarian meals only.");

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
