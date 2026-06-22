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
