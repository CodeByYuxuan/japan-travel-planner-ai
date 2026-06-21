import type { TripRequest } from "../../../../packages/shared/src/schemas/tripRequest.js";

export const mockTripRequest = {
  startDate: "2026-04-06",
  endDate: "2026-04-08",
  cities: ["Tokyo", "Kyoto"],
  interests: [
    "spring flowers",
    "temples",
    "local food",
    "walkable neighborhoods"
  ],
  pace: "balanced",
  budget: "moderate",
  constraints: [
    "Prefer rail-friendly days",
    "Avoid late-night activities",
    "Include time for relaxed meals"
  ]
} satisfies TripRequest;
