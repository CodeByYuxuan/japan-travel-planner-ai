import { useMemo, useState } from "react";

import type { TripRequest } from "../../../../../packages/shared/src/schemas/tripRequest.js";
import {
  createTripApiClient,
  TripApiClientError,
  type TripApiClient
} from "../../lib/api/client.js";
import type { GenerateItineraryResponse } from "../../lib/api/types.js";

export type GenerateItineraryStatus =
  | "error"
  | "generated"
  | "generating"
  | "idle";

export function getGenerateItineraryErrorMessage(error: unknown) {
  if (error instanceof TripApiClientError) {
    if (error.code === "TRIP_API_UNAVAILABLE") {
      return "Could not reach the itinerary generation API. Make sure the API server is running, then try again.";
    }

    if (error.code === "AI_PROVIDER_CONFIGURATION_ERROR") {
      return "AI itinerary generation is not configured on the API server. Add the server OpenAI key or use mock preview.";
    }

    if (error.code === "AI_PROVIDER_REQUEST_FAILED") {
      return "AI itinerary generation is unavailable right now. Try again or use mock preview.";
    }

    if (error.code === "AI_ITINERARY_INVALID_OUTPUT") {
      return "AI returned an itinerary the app could not use. Try again or use mock preview.";
    }

    if (error.code === "VALIDATION_ERROR") {
      const fieldErrorSummary =
        error.fieldErrors && error.fieldErrors.length > 0
          ? ` ${error.fieldErrors
              .map((fieldError) => `${fieldError.path}: ${fieldError.message}`)
              .join(" ")}`
          : "";

      return `${error.message}${fieldErrorSummary}`;
    }

    return error.message;
  }

  return "AI itinerary generation is unavailable right now. Try again or use mock preview.";
}

export async function generateTripItinerary(
  client: Pick<TripApiClient, "generateItinerary">,
  request: TripRequest
): Promise<GenerateItineraryResponse> {
  return client.generateItinerary(request);
}

export function useGeneratedItinerary(
  options: { client?: Pick<TripApiClient, "generateItinerary"> } = {}
) {
  const defaultClient = useMemo(() => createTripApiClient(), []);
  const client = options.client ?? defaultClient;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerateItineraryStatus>("idle");

  return {
    clearError: () => {
      setErrorMessage(null);
      setStatus((currentStatus) =>
        currentStatus === "error" ? "idle" : currentStatus
      );
    },
    errorMessage,
    generateItinerary: async (request: TripRequest) => {
      setStatus("generating");
      setErrorMessage(null);

      try {
        const result = await generateTripItinerary(client, request);
        setStatus("generated");
        return result;
      } catch (error) {
        setErrorMessage(getGenerateItineraryErrorMessage(error));
        setStatus("error");
        return null;
      }
    },
    status
  };
}
