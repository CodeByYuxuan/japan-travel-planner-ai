import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { itinerarySchema } from "../../../../../packages/shared/src/schemas/itinerary.js";

import {
  AiItineraryOutputParseError,
  parseAiItineraryOutput
} from "./schema.js";

const validModelOutput = {
  title: "Tokyo And Kyoto Spring Highlights",
  startDate: "2026-04-06",
  endDate: "2026-04-07",
  days: [
    {
      dayNumber: 1,
      date: "2026-04-06",
      city: "Tokyo",
      summary: "Ease into Tokyo with blossoms, food, and classic temples.",
      activities: [
        {
          title: "Senso-ji and Nakamise-dori",
          category: "temple",
          timing: {
            startTime: "09:30",
            endTime: "11:30",
            timeOfDay: "early morning"
          },
          durationMinutes: "120 minutes",
          location: {
            name: "Senso-ji",
            address: "2 Chome-3-1 Asakusa, Taito City, Tokyo",
            city: "Tokyo"
          },
          costLevel: "free",
          notes: "Arrive early and keep side-street time flexible."
        },
        {
          title: "Ameyoko lunch crawl",
          category: "restaurant",
          timing: {
            startTime: "12:00",
            endTime: "13:15",
            timeOfDay: "midday"
          },
          durationMinutes: 75,
          location: {
            name: "Ameya-Yokocho Market",
            city: "Tokyo"
          },
          costLevel: "moderate",
          notes:
            "Pick a few vegetarian-friendly stalls instead of one heavy lunch."
        }
      ]
    },
    {
      dayNumber: 2,
      date: "2026-04-07",
      city: "Kyoto",
      summary: "Transfer to Kyoto, then focus on eastern temples.",
      activities: [
        {
          title: "Tokaido Shinkansen to Kyoto",
          category: "transport",
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
          costLevel: "expensive",
          notes:
            "Treat train timing as approximate and leave station transfer buffer."
        }
      ]
    }
  ]
};

describe("parseAiItineraryOutput", () => {
  test("parses representative model output into a shared-schema-valid itinerary", () => {
    const itinerary = parseAiItineraryOutput(validModelOutput);
    const firstActivity = itinerary.days[0]?.activities[0];
    const secondActivity = itinerary.days[0]?.activities[1];
    const transferActivity = itinerary.days[1]?.activities[0];

    expect(itinerarySchema.safeParse(itinerary).success).toBe(true);
    expect(itinerary.title).toBe("Tokyo And Kyoto Spring Highlights");
    expect(firstActivity).toMatchObject({
      category: "culture",
      costLevel: "free",
      durationMinutes: 120,
      timing: {
        timeOfDay: "morning"
      }
    });
    expect(secondActivity).toMatchObject({
      category: "food",
      costLevel: "medium",
      timing: {
        timeOfDay: "afternoon"
      }
    });
    expect(transferActivity).toMatchObject({
      category: "transit",
      costLevel: "high"
    });
  });

  test("accepts a JSON string model output", () => {
    expect(parseAiItineraryOutput(JSON.stringify(validModelOutput))).toEqual(
      parseAiItineraryOutput(validModelOutput)
    );
  });

  test("rejects missing required activity fields with a structured error", () => {
    const invalidOutput = {
      ...validModelOutput,
      days: [
        {
          ...validModelOutput.days[0],
          activities: [
            {
              title: "Senso-ji and Nakamise-dori",
              category: "culture",
              timing: {
                startTime: "09:30",
                endTime: "11:30",
                timeOfDay: "morning"
              },
              durationMinutes: 120,
              costLevel: "free",
              notes: "Location is intentionally missing."
            }
          ]
        }
      ]
    };

    expectAiItineraryParseError(invalidOutput, "days.0.activities.0.location");
  });

  test("rejects malformed day structures", () => {
    const invalidOutput = {
      ...validModelOutput,
      days: [
        {
          ...validModelOutput.days[0],
          dayNumber: 2,
          date: "2026-04-09"
        }
      ]
    };

    expectAiItineraryParseError(invalidOutput, "days.0.dayNumber");
    expectAiItineraryParseError(invalidOutput, "days.0.date");
  });

  test("rejects unsupported category and cost values", () => {
    const invalidOutput = {
      ...validModelOutput,
      days: [
        {
          ...validModelOutput.days[0],
          activities: [
            {
              ...validModelOutput.days[0]?.activities[0],
              category: "nightlife",
              costLevel: "splurge"
            }
          ]
        }
      ]
    };

    expectAiItineraryParseError(invalidOutput, "days.0.activities.0.category");
    expectAiItineraryParseError(invalidOutput, "days.0.activities.0.costLevel");
  });

  test("rejects non-JSON string output", () => {
    expectAiItineraryParseError("not json", "modelOutput");
  });

  test("does not import or call the OpenAI provider", () => {
    const serviceDirectory = fileURLToPath(new URL(".", import.meta.url));
    const promptSource = readFileSync(`${serviceDirectory}/prompt.ts`, "utf8");
    const schemaSource = readFileSync(`${serviceDirectory}/schema.ts`, "utf8");

    expect(`${promptSource}\n${schemaSource}`).not.toMatch(
      /providers\/openai|openaiClient|responses\.create|createOpenAiProvider/
    );
  });
});

function expectAiItineraryParseError(
  output: unknown,
  expectedPath: string
): void {
  try {
    parseAiItineraryOutput(output);
  } catch (error) {
    expect(error).toBeInstanceOf(AiItineraryOutputParseError);

    if (error instanceof AiItineraryOutputParseError) {
      expect(error.code).toBe("AI_ITINERARY_OUTPUT_INVALID");
      expect(error.fieldErrors.map((fieldError) => fieldError.path)).toContain(
        expectedPath
      );
    }

    return;
  }

  throw new Error("Expected parseAiItineraryOutput to throw.");
}
