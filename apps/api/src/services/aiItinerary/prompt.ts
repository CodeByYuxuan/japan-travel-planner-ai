import {
  activityCategorySchema,
  activityCostLevelSchema,
  tripRequestSchema,
  type TravelPace,
  type TripRequest
} from "@japan-travel-planner/shared";

export type ItineraryPrompt = {
  instructions: string;
  input: string;
};

const activityCountLimitsByPace = {
  relaxed: "2 to 3 substantial activities per day",
  balanced: "3 to 4 activities per day",
  packed: "4 to 5 activities per day, only when travel time still works"
} satisfies Record<TravelPace, string>;

const dietaryConstraintKeywords = [
  "allerg",
  "dairy",
  "diet",
  "gluten",
  "halal",
  "kosher",
  "nut",
  "pescatarian",
  "seafood",
  "shellfish",
  "vegan",
  "vegetarian"
];

const accessibilityConstraintKeywords = [
  "accessible",
  "accessibility",
  "cane",
  "elevator",
  "lift",
  "mobility",
  "step-free",
  "stairs",
  "stroller",
  "walking limit",
  "wheelchair"
];

const allowedCategories = activityCategorySchema.options.join(", ");
const allowedCostLevels = activityCostLevelSchema.options.join(", ");

export const itineraryPromptInstructions = [
  "You are Japan Travel Planner AI's backend itinerary planner.",
  "Return structured JSON only. Do not include Markdown, commentary, citations, or prose outside the JSON object.",
  "Create realistic Japan travel days that respect the requested dates, destination cities, pace, budget, interests, and constraints.",
  "Group activities by city and avoid bouncing between distant neighborhoods or cities within the same day.",
  "Account for approximate travel time between activities, including transfer time when a day changes cities.",
  "Do not claim live booking availability, exact transit guarantees, real-time opening hours, hidden provider data, weather certainty, or map route precision.",
  "Map, weather, hotel, booking, and provider enrichment are not available yet; write notes that are useful without pretending those integrations were queried.",
  "Use conservative wording for uncertain details and keep every activity editable by the application."
].join("\n");

export function buildItineraryPrompt(input: TripRequest): ItineraryPrompt {
  const request = tripRequestSchema.parse(input);
  const dietaryConstraints = pickMatchingConstraints(
    request.constraints,
    dietaryConstraintKeywords
  );
  const accessibilityConstraints = pickMatchingConstraints(
    request.constraints,
    accessibilityConstraintKeywords
  );
  const activityCountLimit = activityCountLimitsByPace[request.pace];

  return {
    instructions: itineraryPromptInstructions,
    input: [
      "Trip request",
      `Dates: ${request.startDate} to ${request.endDate}`,
      `Destination cities, in requested order: ${request.cities.join(", ")}`,
      `Travel pace: ${request.pace}`,
      `Budget level: ${request.budget}`,
      "",
      "Interests:",
      formatBulletList(request.interests),
      "",
      "User constraints:",
      formatBulletList(request.constraints),
      "",
      "Dietary constraints identified from user constraints:",
      formatBulletList(dietaryConstraints),
      "",
      "Accessibility constraints identified from user constraints:",
      formatBulletList(accessibilityConstraints),
      "",
      "Planning rules:",
      "- Keep each day centered on one primary city unless the day is a realistic transfer day.",
      "- Preserve the requested city order and group consecutive days in the same city where practical.",
      "- Include an explicit transit activity when moving between Tokyo, Kyoto, Osaka, or other distant cities.",
      "- Leave enough buffer for meals, station transfers, luggage handling, and neighborhood changes.",
      `- Activity count limit: ${activityCountLimit}.`,
      "- Prefer realistic pacing over covering every possible attraction.",
      "- Avoid unsupported claims about bookings, exact train schedules, weather, hotel availability, or provider-only facts.",
      "",
      "Structured output contract:",
      "Return exactly one JSON object with this shape:",
      "{",
      '  "title": "string",',
      '  "startDate": "YYYY-MM-DD",',
      '  "endDate": "YYYY-MM-DD",',
      '  "days": [',
      "    {",
      '      "dayNumber": 1,',
      '      "date": "YYYY-MM-DD",',
      '      "city": "string",',
      '      "summary": "string",',
      '      "activities": [',
      "        {",
      '          "title": "string",',
      `          "category": "one of: ${allowedCategories}",`,
      '          "timing": { "startTime": "HH:MM", "endTime": "HH:MM", "timeOfDay": "morning | afternoon | evening | night" },',
      '          "durationMinutes": 90,',
      '          "location": { "name": "string", "address": "string", "city": "string" },',
      `          "costLevel": "one of: ${allowedCostLevels}",`,
      '          "notes": "string"',
      "        }",
      "      ]",
      "    }",
      "  ]",
      "}"
    ].join("\n")
  };
}

function pickMatchingConstraints(
  constraints: string[],
  keywords: string[]
): string[] {
  return constraints.filter((constraint) => {
    const normalizedConstraint = constraint.toLowerCase();

    return keywords.some((keyword) =>
      normalizedConstraint.includes(keyword.toLowerCase())
    );
  });
}

function formatBulletList(items: string[]): string {
  if (items.length === 0) {
    return "- None provided";
  }

  return items.map((item) => `- ${item}`).join("\n");
}
