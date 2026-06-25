import { describe, expect, test } from "vitest";

import { ApiError } from "../errors/ApiError.js";
import type { TripResponse } from "../repositories/tripRepository.js";
import { buildItineraryPdfLines } from "../templates/itineraryPdf/template.js";

import { createPdfFilename, PdfExportService } from "./pdfExportService.js";

const trip = {
  id: "trip-1",
  title: "Tokyo And Kyoto Spring Highlights",
  startDate: "2026-04-06",
  endDate: "2026-04-08",
  cities: ["Tokyo", "Kyoto"],
  interests: ["temples", "local food"],
  pace: "balanced",
  budget: "moderate",
  constraints: ["Avoid late-night activities"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  days: [
    {
      id: "day-1",
      date: "2026-04-06",
      city: "Tokyo",
      summary: "Explore old Tokyo and classic food stops.",
      weatherSummary: "Mild spring weather.",
      activities: [
        {
          id: "activity-1",
          title: "Senso-ji and Nakamise-dori",
          category: "culture",
          timing: {
            startTime: "09:30",
            endTime: "11:30",
            timeOfDay: "morning"
          },
          durationMinutes: 120,
          location: {
            name: "Senso-ji",
            address: "2 Chome-3-1 Asakusa, Taito City, Tokyo",
            city: "Tokyo",
            mapUrl:
              "https://www.google.com/maps/search/?api=1&query=Senso-ji%20Tokyo"
          },
          costLevel: "free",
          notes: "Arrive early for lighter crowds."
        }
      ]
    }
  ]
} satisfies TripResponse;

describe("buildItineraryPdfLines", () => {
  test("includes itinerary details needed for a readable PDF export", () => {
    const lines = buildItineraryPdfLines(trip, {
      exportedAt: new Date("2026-01-03T04:05:06.000Z")
    }).map((line) => line.text);

    expect(lines).toEqual(
      expect.arrayContaining([
        "Tokyo And Kyoto Spring Highlights",
        "2026-04-06 to 2026-04-08",
        "Cities: Tokyo, Kyoto",
        "Pace: Balanced | Budget: Moderate",
        "Interests: temples, local food",
        "Constraints: Avoid late-night activities",
        "Day 1: Tokyo (2026-04-06)",
        "Summary: Explore old Tokyo and classic food stops.",
        "Weather: Mild spring weather.",
        "1. Senso-ji and Nakamise-dori",
        "Timing: 09:30-11:30",
        "Duration: 120 minutes",
        "Location: Senso-ji, 2 Chome-3-1 Asakusa, Taito City, Tokyo, Tokyo",
        "Category: Culture",
        "Cost: Free",
        "Notes: Arrive early for lighter crowds.",
        "Map: https://www.google.com/maps/search/?api=1&query=Senso-ji%20Tokyo",
        "Read-only export generated 2026-01-03T04:05:06.000Z"
      ])
    );
  });
});

describe("PdfExportService", () => {
  test("generates a deterministic PDF file and safe filename", async () => {
    const service = new PdfExportService({
      now: () => new Date("2026-01-03T04:05:06.000Z")
    });

    const pdf = await service.createTripPdf(trip);
    const text = pdf.buffer.toString("utf8");

    expect(pdf.filename).toBe("tokyo-and-kyoto-spring-highlights.pdf");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Tokyo And Kyoto Spring Highlights");
    expect(text).toContain("Senso-ji and Nakamise-dori");
    expect(text).toContain("Read-only export generated 2026-01-03T04:05:06.000Z");
    expect(text).not.toContain("anonymousSessionId");
    expect(text).not.toContain("userId");
  });

  test("sanitizes empty or unsafe titles for filenames", () => {
    expect(createPdfFilename({ title: "Kyoto: Spring / Food!" })).toBe(
      "kyoto-spring-food.pdf"
    );
    expect(createPdfFilename({ title: "!!!" })).toBe("itinerary.pdf");
  });

  test("maps PDF renderer failures to a safe structured API error", async () => {
    const service = new PdfExportService({
      renderer: () => {
        throw new Error("renderer exploded");
      }
    });

    await expect(service.createTripPdf(trip)).rejects.toBeInstanceOf(ApiError);
    await expect(service.createTripPdf(trip)).rejects.toMatchObject({
      code: "PDF_EXPORT_FAILED",
      message: "PDF export could not be generated.",
      statusCode: 500
    });
  });
});
