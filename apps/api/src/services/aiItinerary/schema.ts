import { z, type ZodIssue } from "zod";

import {
  activityCategorySchema,
  activityCostLevelSchema,
  activityLocationSchema,
  itinerarySchema,
  isoDateSchema,
  type ActivityCategory,
  type ActivityCostLevel,
  type Itinerary
} from "@japan-travel-planner/shared";

export type AiItineraryOutputFieldError = {
  path: string;
  message: string;
};

export class AiItineraryOutputParseError extends Error {
  readonly code = "AI_ITINERARY_OUTPUT_INVALID";
  readonly fieldErrors: AiItineraryOutputFieldError[];

  constructor(message: string, fieldErrors: AiItineraryOutputFieldError[]) {
    super(message);
    this.name = "AiItineraryOutputParseError";
    this.fieldErrors = fieldErrors;
  }
}

const timeOfDaySchema = z.enum(["morning", "afternoon", "evening", "night"]);

const categoryAliases = {
  attraction: "sightseeing",
  dining: "food",
  dinner: "food",
  lunch: "food",
  market: "shopping",
  meal: "food",
  museum: "culture",
  park: "nature",
  restaurant: "food",
  scenery: "nature",
  scenic: "sightseeing",
  shrine: "culture",
  temple: "culture",
  train: "transit",
  transfer: "transit",
  transport: "transit",
  transportation: "transit",
  walk: "sightseeing"
} satisfies Record<string, ActivityCategory>;

const costLevelAliases = {
  cheap: "low",
  expensive: "high",
  luxury: "high",
  mid: "medium",
  moderate: "medium",
  premium: "high"
} satisfies Record<string, ActivityCostLevel>;

const timeOfDayAliases = {
  brunch: "morning",
  daytime: "afternoon",
  dinner: "evening",
  early: "morning",
  "early morning": "morning",
  late: "night",
  midday: "afternoon",
  noon: "afternoon",
  overnight: "night",
  sunset: "evening"
} satisfies Record<string, z.infer<typeof timeOfDaySchema>>;

const modelActivityCategorySchema = z.preprocess(
  (value) => normalizeAliasedValue(value, categoryAliases),
  activityCategorySchema
);

const modelActivityCostLevelSchema = z.preprocess(
  (value) => normalizeAliasedValue(value, costLevelAliases),
  activityCostLevelSchema
);

const modelTimeOfDaySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return normalizeAliasedValue(value, timeOfDayAliases);
}, timeOfDaySchema.optional());

const modelDurationMinutesSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const match = value
    .trim()
    .match(/^(\d+)(?:\s*(?:m|min|mins|minute|minutes))?$/i);

  return match?.[1] === undefined ? value : Number(match[1]);
}, z.number().int().positive());

const modelActivityTimingSchema = z
  .object({
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    timeOfDay: modelTimeOfDaySchema
  })
  .strict()
  .refine(
    (timing) => Boolean(timing.startTime ?? timing.timeOfDay),
    "Provide either startTime or timeOfDay."
  );

const modelActivitySchema = z
  .object({
    id: z.string().min(1).optional(),
    title: z.string().min(1),
    category: modelActivityCategorySchema,
    timing: modelActivityTimingSchema,
    durationMinutes: modelDurationMinutesSchema,
    location: activityLocationSchema,
    costLevel: modelActivityCostLevelSchema,
    notes: z.string().min(1)
  })
  .strict();

const modelTripDaySchema = z
  .object({
    dayNumber: z.number().int().positive().optional(),
    date: isoDateSchema,
    city: z.string().min(1),
    summary: z.string().min(1).optional(),
    activities: z.array(modelActivitySchema).min(1)
  })
  .strict();

export const aiItineraryModelOutputSchema = z
  .object({
    title: z.string().min(1),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    days: z.array(modelTripDaySchema).min(1)
  })
  .strict()
  .superRefine((output, context) => {
    if (output.startDate > output.endDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "endDate must be on or after startDate."
      });
    }

    const seenDates = new Set<string>();
    let previousDate: string | undefined;

    output.days.forEach((day, index) => {
      if (day.dayNumber !== undefined && day.dayNumber !== index + 1) {
        context.addIssue({
          code: "custom",
          path: ["days", index, "dayNumber"],
          message: "dayNumber must match the day position."
        });
      }

      if (day.date < output.startDate || day.date > output.endDate) {
        context.addIssue({
          code: "custom",
          path: ["days", index, "date"],
          message: "day date must be within the itinerary date range."
        });
      }

      if (previousDate !== undefined && day.date < previousDate) {
        context.addIssue({
          code: "custom",
          path: ["days", index, "date"],
          message: "day dates must be in chronological order."
        });
      }

      if (seenDates.has(day.date)) {
        context.addIssue({
          code: "custom",
          path: ["days", index, "date"],
          message: "day dates must be unique."
        });
      }

      seenDates.add(day.date);
      previousDate = day.date;
    });
  });

export type AiItineraryModelOutput = z.infer<
  typeof aiItineraryModelOutputSchema
>;

export function parseAiItineraryOutput(modelOutput: unknown): Itinerary {
  const jsonOutput = parseUnknownJson(modelOutput);
  const modelResult = aiItineraryModelOutputSchema.safeParse(jsonOutput);

  if (!modelResult.success) {
    throw new AiItineraryOutputParseError(
      "AI itinerary output did not match the expected structured contract.",
      zodIssuesToOutputFieldErrors(modelResult.error.issues)
    );
  }

  const itineraryResult = itinerarySchema.safeParse(
    mapModelOutputToItinerary(modelResult.data)
  );

  if (!itineraryResult.success) {
    throw new AiItineraryOutputParseError(
      "AI itinerary output could not be mapped to the shared itinerary schema.",
      zodIssuesToOutputFieldErrors(itineraryResult.error.issues)
    );
  }

  return itineraryResult.data;
}

function mapModelOutputToItinerary(output: AiItineraryModelOutput): Itinerary {
  return {
    title: output.title,
    startDate: output.startDate,
    endDate: output.endDate,
    days: output.days.map((day) => ({
      date: day.date,
      city: day.city,
      ...(day.summary !== undefined ? { summary: day.summary } : {}),
      activities: day.activities.map((activity) => ({
        ...(activity.id !== undefined ? { id: activity.id } : {}),
        title: activity.title,
        category: activity.category,
        timing: activity.timing,
        durationMinutes: activity.durationMinutes,
        location: activity.location,
        costLevel: activity.costLevel,
        notes: activity.notes
      }))
    }))
  };
}

function parseUnknownJson(modelOutput: unknown): unknown {
  if (typeof modelOutput !== "string") {
    return modelOutput;
  }

  try {
    return JSON.parse(modelOutput) as unknown;
  } catch {
    throw new AiItineraryOutputParseError(
      "AI itinerary output must be valid JSON.",
      [
        {
          path: "modelOutput",
          message: "Expected a valid JSON object or object-compatible value."
        }
      ]
    );
  }
}

function normalizeAliasedValue<T extends string>(
  value: unknown,
  aliases: Record<string, T>
): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ");

  return aliases[normalized] ?? normalized.replace(/\s+/g, "");
}

function zodIssuesToOutputFieldErrors(
  issues: readonly ZodIssue[]
): AiItineraryOutputFieldError[] {
  return issues.map((issue) => ({
    path:
      issue.path.length > 0 ? issue.path.map(String).join(".") : "modelOutput",
    message: issue.message
  }));
}
