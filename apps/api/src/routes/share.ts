import { Router, type RequestHandler } from "express";

import { ApiError } from "../errors/ApiError.js";
import { sendPdfExportResponse } from "./export.js";
import type { PdfExportService } from "../services/pdfExportService.js";
import type { ShareService } from "../services/shareService.js";

function asyncHandler(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function getShareToken(value: string | string[] | undefined) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  throw new ApiError({
    statusCode: 404,
    code: "SHARE_LINK_NOT_FOUND",
    message: "Share link was not found."
  });
}

export function createShareRouter(
  shareService: ShareService,
  pdfExportService: PdfExportService
) {
  const router = Router();

  router.get(
    "/:shareToken/export/pdf",
    asyncHandler(async (request, response) => {
      const sharedTrip = await shareService.getSharedTrip(
        getShareToken(request.params.shareToken)
      );
      const pdf = await pdfExportService.createTripPdf(sharedTrip.trip);

      sendPdfExportResponse(response, pdf);
    })
  );

  router.get(
    "/:shareToken",
    asyncHandler(async (request, response) => {
      const sharedTrip = await shareService.getSharedTrip(
        getShareToken(request.params.shareToken)
      );

      response.status(200).json(sharedTrip);
    })
  );

  return router;
}
