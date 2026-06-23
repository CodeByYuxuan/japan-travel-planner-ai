import { Router, type RequestHandler } from "express";
import {
  tripRequestSchema,
  type TripRequest
} from "@japan-travel-planner/shared";

import { validateRequest } from "../middleware/validateRequest.js";
import type { AiItineraryService } from "../services/aiItinerary/generateItinerary.js";

function asyncHandler(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function createItinerariesRouter(
  aiItineraryService: AiItineraryService
) {
  const router = Router();

  router.post(
    "/generate",
    validateRequest(tripRequestSchema),
    asyncHandler(async (request, response) => {
      const result = await aiItineraryService.generateItinerary(
        request.body as TripRequest
      );

      response.status(200).json(result);
    })
  );

  return router;
}
