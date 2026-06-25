import type { Response } from "express";

import type { PdfExportFile } from "../services/pdfExportService.js";

function escapeContentDispositionValue(value: string) {
  return value.replace(/["\\]/g, "");
}

export function createPdfContentDisposition(filename: string) {
  return `attachment; filename="${escapeContentDispositionValue(filename)}"`;
}

export function sendPdfExportResponse(
  response: Response,
  pdf: PdfExportFile
) {
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", createPdfContentDisposition(pdf.filename));
  response.setHeader("Cache-Control", "no-store");
  response.status(200).send(pdf.buffer);
}
