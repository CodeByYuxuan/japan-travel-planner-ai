import { Router, type RequestHandler } from "express";
import {
  tripRequestSchema,
  type TripRequest
} from "@japan-travel-planner/shared";

import { getClientRateLimitIdentifier } from "../middleware/rateLimit.js";
import { validateRequest } from "../middleware/validateRequest.js";
import type { AiItineraryService } from "../services/aiItinerary/generateItinerary.js";
import {
  noopAiUsageLogger,
  recordAiUsageSafely,
  type AiUsageLogger
} from "../services/aiItinerary/usageLogger.js";

function asyncHandler(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

type CreateItinerariesRouterOptions = {
  rateLimitMiddleware?: RequestHandler | undefined;
  usageLogger?: AiUsageLogger | undefined;
};

export function createItinerariesRouter(
  aiItineraryService: AiItineraryService,
  options: CreateItinerariesRouterOptions = {}
) {
  const router = Router();
  const usageLogger = options.usageLogger ?? noopAiUsageLogger;

  router.post(
    "/generate",
    ...(options.rateLimitMiddleware !== undefined
      ? [options.rateLimitMiddleware]
      : []),
    validateRequest(tripRequestSchema, {
      onValidationError: ({ request }) => {
        void recordAiUsageSafely(usageLogger, {
          attempts: 0,
          estimatedCostUsd: null,
          model: null,
          outcome: "validation_error",
          requestIdentifier: getClientRateLimitIdentifier(request),
          tokenUsage: null
        });
      }
    }),
    asyncHandler(async (request, response) => {
      const result = await aiItineraryService.generateItinerary(
        request.body as TripRequest,
        {
          requestIdentifier: getClientRateLimitIdentifier(request)
        }
      );

      response.status(200).json(result);
    })
  );

  return router;
}
