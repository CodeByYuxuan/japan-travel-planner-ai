import { Router, type RequestHandler } from "express";
import { z } from "zod";

import { ApiError } from "../errors/ApiError.js";
import { validateRequest } from "../middleware/validateRequest.js";
import type {
  CreateTripInput,
  UpdateTripInput
} from "../repositories/tripRepository.js";
import type { TripService } from "../services/tripService.js";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const travelPaceSchema = z.enum(["relaxed", "balanced", "packed"]);
const travelBudgetSchema = z.enum(["budget", "moderate", "luxury"]);
const activityCategorySchema = z.enum([
  "sightseeing",
  "food",
  "culture",
  "nature",
  "shopping",
  "transit",
  "lodging",
  "other"
]);
const activityCostLevelSchema = z.enum(["free", "low", "medium", "high"]);

const activityTimingSchema = z
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

const activityLocationSchema = z
  .object({
    name: z.string().min(1),
    address: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    mapUrl: z.string().url().optional()
  })
  .strict();

const activityInputSchema = z
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

const tripDayInputSchema = z
  .object({
    date: isoDateSchema,
    city: z.string().min(1),
    summary: z.string().optional(),
    weatherSummary: z.string().optional(),
    activities: z.array(activityInputSchema).min(1)
  })
  .strict();

const tripCreateBodySchema = z
  .object({
    title: z.string().min(1),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    cities: z.array(z.string().min(1)).min(1),
    interests: z.array(z.string().min(1)).min(1),
    pace: travelPaceSchema,
    budget: travelBudgetSchema,
    constraints: z.array(z.string().min(1)).default([]),
    days: z.array(tripDayInputSchema).min(1)
  })
  .strict()
  .refine((trip) => trip.startDate <= trip.endDate, {
    message: "endDate must be on or after startDate.",
    path: ["endDate"]
  });

const tripUpdateBodySchema = z
  .object({
    title: z.string().min(1).optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    cities: z.array(z.string().min(1)).min(1).optional(),
    interests: z.array(z.string().min(1)).min(1).optional(),
    pace: travelPaceSchema.optional(),
    budget: travelBudgetSchema.optional(),
    constraints: z.array(z.string().min(1)).optional(),
    days: z.array(tripDayInputSchema).min(1).optional()
  })
  .strict()
  .refine((trip) => Object.keys(trip).length > 0, {
    message: "Provide at least one editable trip field.",
    path: ["requestBody"]
  })
  .refine(
    (trip) =>
      trip.startDate === undefined ||
      trip.endDate === undefined ||
      trip.startDate <= trip.endDate,
    {
      message: "endDate must be on or after startDate.",
      path: ["endDate"]
    }
  );

function asyncHandler(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function getTripId(value: string | string[] | undefined) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  throw new ApiError({
    statusCode: 400,
    code: "INVALID_TRIP_ID",
    message: "Trip ID is required."
  });
}

export function createTripsRouter(tripService: TripService) {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_request, response) => {
      const trips = await tripService.listTrips();

      response.status(200).json({ trips });
    })
  );

  router.post(
    "/",
    validateRequest(tripCreateBodySchema),
    asyncHandler(async (request, response) => {
      const trip = await tripService.createTrip(
        request.body as CreateTripInput
      );

      response.status(201).json({ trip });
    })
  );

  router.get(
    "/:tripId",
    asyncHandler(async (request, response) => {
      const trip = await tripService.getTrip(getTripId(request.params.tripId));

      response.status(200).json({ trip });
    })
  );

  router.patch(
    "/:tripId",
    validateRequest(tripUpdateBodySchema),
    asyncHandler(async (request, response) => {
      const trip = await tripService.updateTrip(
        getTripId(request.params.tripId),
        request.body as UpdateTripInput
      );

      response.status(200).json({ trip });
    })
  );

  router.delete(
    "/:tripId",
    asyncHandler(async (request, response) => {
      await tripService.deleteTrip(getTripId(request.params.tripId));

      response.status(204).send();
    })
  );

  return router;
}
