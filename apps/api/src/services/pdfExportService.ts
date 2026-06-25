import { ApiError } from "../errors/ApiError.js";
import type { TripResponse } from "../repositories/tripRepository.js";
import {
  buildItineraryPdfLines,
  renderItineraryPdf
} from "../templates/itineraryPdf/template.js";

export type PdfExportFile = {
  buffer: Buffer;
  filename: string;
};

export type PdfExportRenderer = (
  trip: TripResponse,
  options: { exportedAt: Date }
) => Buffer;

export type PdfExportServiceOptions = {
  now?: () => Date;
  renderer?: PdfExportRenderer;
};

function slugifyFilename(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug.length > 0 ? slug : "itinerary";
}

export function createPdfFilename(trip: Pick<TripResponse, "title">) {
  return `${slugifyFilename(trip.title)}.pdf`;
}

export class PdfExportService {
  private readonly now: () => Date;
  private readonly renderer: PdfExportRenderer;

  constructor(options: PdfExportServiceOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.renderer =
      options.renderer ??
      ((trip, { exportedAt }) =>
        renderItineraryPdf(buildItineraryPdfLines(trip, { exportedAt })));
  }

  async createTripPdf(trip: TripResponse): Promise<PdfExportFile> {
    try {
      const exportedAt = this.now();

      return {
        buffer: this.renderer(trip, { exportedAt }),
        filename: createPdfFilename(trip)
      };
    } catch {
      throw new ApiError({
        statusCode: 500,
        code: "PDF_EXPORT_FAILED",
        message: "PDF export could not be generated."
      });
    }
  }
}

export function createPdfExportService(options: PdfExportServiceOptions = {}) {
  return new PdfExportService(options);
}
