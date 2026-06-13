import { z } from "zod";

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const travelPaceSchema = z.enum(["relaxed", "balanced", "packed"]);

export const travelBudgetSchema = z.enum(["budget", "moderate", "luxury"]);

export const tripRequestSchema = z
  .object({
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    cities: z.array(z.string().min(1)).min(1),
    interests: z.array(z.string().min(1)).min(1),
    pace: travelPaceSchema,
    budget: travelBudgetSchema,
    constraints: z.array(z.string().min(1)).default([])
  })
  .strict()
  .refine((request) => request.startDate <= request.endDate, {
    message: "endDate must be on or after startDate.",
    path: ["endDate"]
  });

export type IsoDate = z.infer<typeof isoDateSchema>;
export type TravelPace = z.infer<typeof travelPaceSchema>;
export type TravelBudget = z.infer<typeof travelBudgetSchema>;
export type TripRequest = z.infer<typeof tripRequestSchema>;
