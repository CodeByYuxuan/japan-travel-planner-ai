import { describe, expect, test } from "vitest";

import type { TripRequest } from "../../../../../packages/shared/src/schemas/tripRequest.js";

import { buildItineraryPrompt, itineraryPromptInstructions } from "./prompt.js";

const representativeTripRequest = {
  startDate: "2026-04-06",
  endDate: "2026-04-08",
  cities: ["Tokyo", "Kyoto"],
  interests: [
    "spring flowers",
    "temples",
    "local food",
    "walkable neighborhoods"
  ],
  pace: "balanced",
  budget: "moderate",
  constraints: [
    "Vegetarian meals only",
    "Traveler uses a wheelchair and needs step-free station routes",
    "Avoid late-night activities"
  ]
} satisfies TripRequest;

describe("buildItineraryPrompt", () => {
  test("constructs a deterministic prompt for a representative Tokyo/Kyoto trip", () => {
    const prompt = buildItineraryPrompt(representativeTripRequest);
    const repeatedPrompt = buildItineraryPrompt({
      ...representativeTripRequest,
      constraints: [...representativeTripRequest.constraints]
    });

    expect(prompt).toEqual(repeatedPrompt);
    expect(prompt.instructions).toBe(itineraryPromptInstructions);
    expect(prompt.input).toContain("Dates: 2026-04-06 to 2026-04-08");
    expect(prompt.input).toContain(
      "Destination cities, in requested order: Tokyo, Kyoto"
    );
    expect(prompt.input).toContain("Travel pace: balanced");
    expect(prompt.input).toContain("Budget level: moderate");
    expect(prompt.input).toContain("- spring flowers");
    expect(prompt.input).toContain("- temples");
  });

  test("includes pacing, city grouping, travel-time, constraints, and activity count limits", () => {
    const prompt = buildItineraryPrompt(representativeTripRequest);
    const combinedPrompt = `${prompt.instructions}\n${prompt.input}`;

    expect(combinedPrompt).toContain("realistic Japan travel days");
    expect(combinedPrompt).toContain("Group activities by city");
    expect(combinedPrompt).toContain("approximate travel time");
    expect(combinedPrompt).toContain("Dietary constraints identified");
    expect(combinedPrompt).toContain("- Vegetarian meals only");
    expect(combinedPrompt).toContain("Accessibility constraints identified");
    expect(combinedPrompt).toContain(
      "- Traveler uses a wheelchair and needs step-free station routes"
    );
    expect(combinedPrompt).toContain("3 to 4 activities per day");
  });

  test("asks for structured output only and avoids unsupported provider claims", () => {
    const prompt = buildItineraryPrompt(representativeTripRequest);
    const combinedPrompt = `${prompt.instructions}\n${prompt.input}`;

    expect(combinedPrompt).toContain("Return structured JSON only");
    expect(combinedPrompt).toContain("Return exactly one JSON object");
    expect(combinedPrompt).toContain("Do not claim live booking availability");
    expect(combinedPrompt).toContain("exact transit guarantees");
    expect(combinedPrompt).toContain(
      "Map, weather, hotel, booking, and provider enrichment are not available yet"
    );
    expect(combinedPrompt).toContain('"activities"');
    expect(combinedPrompt).toContain('"title"');
    expect(combinedPrompt).toContain('"category"');
    expect(combinedPrompt).toContain('"timing"');
    expect(combinedPrompt).toContain('"durationMinutes"');
    expect(combinedPrompt).toContain('"location"');
    expect(combinedPrompt).toContain('"costLevel"');
    expect(combinedPrompt).toContain('"notes"');
  });
});
