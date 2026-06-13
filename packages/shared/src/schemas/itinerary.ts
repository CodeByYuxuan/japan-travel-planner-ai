import { z } from "zod";

import { isoDateSchema } from "./tripRequest.js";

export const activityCategorySchema = z.enum([
  "sightseeing",
  "food",
  "culture",
  "nature",
  "shopping",
  "transit",
  "lodging",
  "other"
]);

export const activityCostLevelSchema = z.enum([
  "free",
  "low",
  "medium",
  "high"
]);

export const activityTimingSchema = z
  .object({
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    timeOfDay: z.enum(["morning", "afternoon", "evening", "night"]).optional()
  })
  .strict()
  .refine(
    (timing) => Boolean(timing.startTime ?? timing.timeOfDay),
    "Provide either startTime or timeOfDay."
  );

export const activityLocationSchema = z
  .object({
    name: z.string().min(1),
    address: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    mapUrl: z.string().url().optional()
  })
  .strict();

export const activitySchema = z
  .object({
    id: z.string().min(1).optional(),
    title: z.string().min(1),
    category: activityCategorySchema,
    timing: activityTimingSchema,
    durationMinutes: z.number().int().positive(),
    location: activityLocationSchema,
    costLevel: activityCostLevelSchema,
    notes: z.string()
  })
  .strict();

export const tripDaySchema = z
  .object({
    date: isoDateSchema,
    city: z.string().min(1),
    summary: z.string().optional(),
    weatherSummary: z.string().optional(),
    activities: z.array(activitySchema).min(1)
  })
  .strict();

export const itinerarySchema = z
  .object({
    title: z.string().min(1),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    days: z.array(tripDaySchema).min(1)
  })
  .strict();

export type ActivityCategory = z.infer<typeof activityCategorySchema>;
export type ActivityCostLevel = z.infer<typeof activityCostLevelSchema>;
export type ActivityTiming = z.infer<typeof activityTimingSchema>;
export type ActivityLocation = z.infer<typeof activityLocationSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type TripDay = z.infer<typeof tripDaySchema>;
export type Itinerary = z.infer<typeof itinerarySchema>;
