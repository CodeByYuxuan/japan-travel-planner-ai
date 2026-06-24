import type {
  Activity,
  Itinerary,
  TripDay
} from "../../../../../packages/shared/src/schemas/itinerary.js";
import type { TripRequest } from "../../../../../packages/shared/src/schemas/tripRequest.js";

export type GenerateItineraryMetadata = {
  attempts: number;
  repaired: boolean;
  model: string;
  tokenUsage: null;
  estimatedCostUsd: null;
};

export type GenerateItineraryResponse = {
  itinerary: Itinerary;
  metadata: GenerateItineraryMetadata;
};

export type TripActivityRecord = Activity & {
  id: string;
};

export type TripDayRecord = Omit<TripDay, "activities"> & {
  id: string;
  activities: TripActivityRecord[];
};

export type TripRecord = Omit<Itinerary, "days"> &
  TripRequest & {
    id: string;
    days: TripDayRecord[];
    createdAt: string;
    updatedAt: string;
  };

export type TripWritePayload = TripRequest & Itinerary;

export function tripRecordToItinerary(trip: TripRecord): Itinerary {
  return {
    title: trip.title,
    startDate: trip.startDate,
    endDate: trip.endDate,
    days: trip.days.map((day) => ({
      date: day.date,
      city: day.city,
      ...(day.summary !== undefined ? { summary: day.summary } : {}),
      ...(day.weatherSummary !== undefined
        ? { weatherSummary: day.weatherSummary }
        : {}),
      activities: day.activities.map((activity) => ({
        ...activity,
        location: { ...activity.location },
        timing: { ...activity.timing }
      }))
    }))
  };
}

export function tripRecordToTripRequest(trip: TripRecord): TripRequest {
  return {
    startDate: trip.startDate,
    endDate: trip.endDate,
    cities: [...trip.cities],
    interests: [...trip.interests],
    pace: trip.pace,
    budget: trip.budget,
    constraints: [...trip.constraints]
  };
}

export function toTripWritePayload(
  request: TripRequest,
  itinerary: Itinerary
): TripWritePayload {
  return {
    title: itinerary.title,
    startDate: request.startDate,
    endDate: request.endDate,
    cities: [...request.cities],
    interests: [...request.interests],
    pace: request.pace,
    budget: request.budget,
    constraints: [...request.constraints],
    days: itinerary.days.map((day) => ({
      date: day.date,
      city: day.city,
      ...(day.summary !== undefined ? { summary: day.summary } : {}),
      ...(day.weatherSummary !== undefined
        ? { weatherSummary: day.weatherSummary }
        : {}),
      activities: day.activities.map((activity) => ({
        ...activity,
        location: { ...activity.location },
        timing: { ...activity.timing }
      }))
    }))
  };
}
