import { useMemo, useState } from "react";

import type { Itinerary } from "../../../../../packages/shared/src/schemas/itinerary.js";
import type { TripRequest } from "../../../../../packages/shared/src/schemas/tripRequest.js";
import {
  createTripApiClient,
  TripApiClientError,
  type TripApiClient
} from "../../lib/api/client.js";
import {
  toTripWritePayload,
  tripRecordToItinerary,
  tripRecordToTripRequest,
  type TripRecord
} from "../../lib/api/types.js";

export type TripDataMode = "api" | "mock";

export type TripOperationStatus =
  | "creating"
  | "error"
  | "idle"
  | "loading"
  | "reopening"
  | "saved"
  | "saving";

export type TripOperationResult = {
  itinerary: Itinerary;
  request: TripRequest;
  trip: TripRecord;
};

export type SaveTripOptions = {
  itinerary: Itinerary;
  request: TripRequest;
  tripId: string | null;
};

export function getDefaultTripDataMode(): TripDataMode {
  return import.meta.env.VITE_TRIP_DATA_MODE === "mock" ? "mock" : "api";
}

export function getTripErrorMessage(error: unknown) {
  if (error instanceof TripApiClientError) {
    if (error.fieldErrors && error.fieldErrors.length > 0) {
      return `${error.message} ${error.fieldErrors
        .map((fieldError) => `${fieldError.path}: ${fieldError.message}`)
        .join(" ")}`;
    }

    return error.message;
  }

  return "Trip storage is unavailable right now.";
}

export async function createSavedTrip(
  client: TripApiClient,
  request: TripRequest,
  itinerary: Itinerary
): Promise<TripOperationResult> {
  const trip = await client.createTrip(toTripWritePayload(request, itinerary));

  return {
    itinerary: tripRecordToItinerary(trip),
    request: tripRecordToTripRequest(trip),
    trip
  };
}

export async function saveTrip(
  client: TripApiClient,
  options: SaveTripOptions
): Promise<TripOperationResult> {
  const payload = toTripWritePayload(options.request, options.itinerary);
  const trip =
    options.tripId === null
      ? await client.createTrip(payload)
      : await client.updateTrip(options.tripId, payload);

  return {
    itinerary: tripRecordToItinerary(trip),
    request: tripRecordToTripRequest(trip),
    trip
  };
}

export async function reopenSavedTrip(
  client: TripApiClient,
  tripId: string
): Promise<TripOperationResult> {
  const trip = await client.getTrip(tripId);

  return {
    itinerary: tripRecordToItinerary(trip),
    request: tripRecordToTripRequest(trip),
    trip
  };
}

function upsertTrip(trips: TripRecord[], trip: TripRecord) {
  const existingIndex = trips.findIndex(
    (candidate) => candidate.id === trip.id
  );

  if (existingIndex === -1) {
    return [trip, ...trips];
  }

  return trips.map((candidate) =>
    candidate.id === trip.id ? trip : candidate
  );
}

export function useTrips(options: { client?: TripApiClient } = {}) {
  const defaultClient = useMemo(() => createTripApiClient(), []);
  const client = options.client ?? defaultClient;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedTrips, setSavedTrips] = useState<TripRecord[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [status, setStatus] = useState<TripOperationStatus>("idle");

  function rememberTrip(trip: TripRecord) {
    setSavedTrips((currentTrips) => upsertTrip(currentTrips, trip));
    setSelectedTripId(trip.id);
  }

  async function runOperation(
    operationStatus: TripOperationStatus,
    operation: () => Promise<TripOperationResult>
  ) {
    setStatus(operationStatus);
    setErrorMessage(null);

    try {
      const result = await operation();
      rememberTrip(result.trip);
      setStatus("saved");
      return result;
    } catch (error) {
      setErrorMessage(getTripErrorMessage(error));
      setStatus("error");
      return null;
    }
  }

  return {
    clearError: () => setErrorMessage(null),
    createTripFromRequest: (request: TripRequest, itinerary: Itinerary) =>
      runOperation("creating", () =>
        createSavedTrip(client, request, itinerary)
      ),
    errorMessage,
    loadSavedTrips: async () => {
      setStatus("loading");
      setErrorMessage(null);

      try {
        const trips = await client.listTrips();
        setSavedTrips(trips);
        setStatus("idle");
        return trips;
      } catch (error) {
        setErrorMessage(getTripErrorMessage(error));
        setStatus("error");
        return null;
      }
    },
    reopenTrip: (tripId: string) =>
      runOperation("reopening", () => reopenSavedTrip(client, tripId)),
    saveTrip: (
      tripId: string | null,
      request: TripRequest,
      itinerary: Itinerary
    ) =>
      runOperation("saving", () =>
        saveTrip(client, {
          itinerary,
          request,
          tripId
        })
      ),
    savedTrips,
    selectedTripId,
    selectTrip: setSelectedTripId,
    status
  };
}
