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

export type SharePermission = "read_only";

export type ShareLinkRecord = {
  token: string;
  permission: SharePermission;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SharedTripRecord = {
  share: ShareLinkRecord;
  trip: TripRecord;
};

export type PdfExportFile = {
  blob: Blob;
  contentType: string;
  filename: string;
};

export type HotelSearchBudget = "budget" | "moderate" | "luxury";

export type HotelSuggestionsRequest = {
  budget?: HotelSearchBudget | undefined;
  city: string;
  endDate: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
  maxResults?: number | undefined;
  radiusKm?: number | undefined;
  startDate: string;
};

export type HotelSuggestion = {
  access: string | null;
  address: string | null;
  amenities: string[];
  bookingUrl: string | null;
  city: string;
  currency: "JPY" | string;
  description: string | null;
  id: string;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  mapUrl: string | null;
  name: string;
  priceFrom: number | null;
  provider: string;
  rating: number | null;
  reviewCount: number | null;
  sourceUpdatedAt: string | null;
  tags: string[];
  thumbnailUrl: string | null;
};

export type HotelSuggestionsResponse =
  | {
      hotelSuggestions: HotelSuggestion[];
      status: "available";
    }
  | {
      hotelSuggestions: HotelSuggestion[];
      status: "empty" | "unavailable";
    };

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
