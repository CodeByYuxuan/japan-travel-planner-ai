import { Router, type RequestHandler } from "express";
import { z } from "zod";

import { validateRequest } from "../middleware/validateRequest.js";
import type { MapsProvider } from "../providers/maps/mapsProvider.js";
import { createMapLink } from "../services/enrichment/mapEnrichment.js";

const mapLinkBodySchema = z
  .object({
    title: z.string().optional(),
    location: z
      .object({
        address: z.string().optional(),
        city: z.string().optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        name: z.string().optional()
      })
      .strict()
      .optional()
  })
  .strict();

function asyncHandler(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function createEnrichmentRouter(options: {
  mapsProvider: MapsProvider;
}) {
  const router = Router();

  router.post(
    "/maps/link",
    validateRequest(mapLinkBodySchema),
    asyncHandler(async (request, response) => {
      response.status(200).json({
        mapUrl: createMapLink(request.body, options.mapsProvider)
      });
    })
  );

  return router;
}
