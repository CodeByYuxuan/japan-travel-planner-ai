import {
  apiErrorSchema,
  type ApiFieldError
} from "../../../../../packages/shared/src/schemas/apiError.js";
import type { TripRequest } from "../../../../../packages/shared/src/schemas/tripRequest.js";
import type {
  GenerateItineraryResponse,
  HotelSuggestionsRequest,
  HotelSuggestionsResponse,
  PdfExportFile,
  ShareLinkRecord,
  SharedTripRecord,
  TripRecord,
  TripWritePayload
} from "./types.js";

export type TripApiClientOptions = {
  baseUrl?: string;
  fetch?: typeof fetch;
};

export type TripApiClientErrorOptions = {
  code: string;
  details?: unknown;
  fieldErrors?: ApiFieldError[] | undefined;
  message: string;
  status?: number | undefined;
};

export class TripApiClientError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly fieldErrors: ApiFieldError[] | undefined;
  readonly status: number | undefined;

  constructor(options: TripApiClientErrorOptions) {
    super(options.message);
    this.name = "TripApiClientError";
    this.code = options.code;
    this.details = options.details;
    this.fieldErrors = options.fieldErrors;
    this.status = options.status;
  }
}

export type TripApiClient = {
  createShareLink: (tripId: string) => Promise<ShareLinkRecord>;
  createTrip: (payload: TripWritePayload) => Promise<TripRecord>;
  exportSharedTripPdf: (shareToken: string) => Promise<PdfExportFile>;
  exportTripPdf: (tripId: string) => Promise<PdfExportFile>;
  generateItinerary: (
    payload: TripRequest
  ) => Promise<GenerateItineraryResponse>;
  getHotelSuggestions: (
    payload: HotelSuggestionsRequest
  ) => Promise<HotelSuggestionsResponse>;
  getSharedTrip: (shareToken: string) => Promise<SharedTripRecord>;
  getTrip: (tripId: string) => Promise<TripRecord>;
  listTrips: () => Promise<TripRecord[]>;
  updateTrip: (
    tripId: string,
    payload: TripWritePayload
  ) => Promise<TripRecord>;
};

function getDefaultApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:3001";
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function getFilenameFromContentDisposition(value: string | null) {
  const match = value?.match(/filename="([^"]+)"/i);

  return match?.[1] ?? "itinerary.pdf";
}

function createApiError(response: Response, body: unknown) {
  const parsedError = apiErrorSchema.safeParse(body);

  if (parsedError.success) {
    return new TripApiClientError({
      code: parsedError.data.error.code,
      details: parsedError.data.error.details,
      message: parsedError.data.error.message,
      status: response.status,
      ...(parsedError.data.error.fieldErrors !== undefined
        ? { fieldErrors: parsedError.data.error.fieldErrors }
        : {})
    });
  }

  return new TripApiClientError({
    code: "TRIP_API_ERROR",
    message: `Trip API request failed with status ${response.status}.`,
    status: response.status
  });
}

export function createTripApiClient(
  options: TripApiClientOptions = {}
): TripApiClient {
  const baseUrl = options.baseUrl ?? getDefaultApiBaseUrl();
  const fetchImpl = options.fetch ?? fetch;

  async function requestJson<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");

    if (options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    try {
      const response = await fetchImpl(joinUrl(baseUrl, path), {
        ...options,
        credentials: "include",
        headers
      });
      const body = await parseJsonResponse(response);

      if (!response.ok) {
        throw createApiError(response, body);
      }

      return body as T;
    } catch (error) {
      if (error instanceof TripApiClientError) {
        throw error;
      }

      throw new TripApiClientError({
        code: "TRIP_API_UNAVAILABLE",
        message: `Could not reach the trip API at ${baseUrl}.`
      });
    }
  }

  async function requestBlob(path: string): Promise<PdfExportFile> {
    try {
      const response = await fetchImpl(joinUrl(baseUrl, path), {
        credentials: "include",
        headers: {
          Accept: "application/pdf"
        }
      });

      if (!response.ok) {
        throw createApiError(response, await parseJsonResponse(response));
      }

      return {
        blob: await response.blob(),
        contentType: response.headers.get("Content-Type") ?? "application/pdf",
        filename: getFilenameFromContentDisposition(
          response.headers.get("Content-Disposition")
        )
      };
    } catch (error) {
      if (error instanceof TripApiClientError) {
        throw error;
      }

      throw new TripApiClientError({
        code: "TRIP_API_UNAVAILABLE",
        message: `Could not reach the trip API at ${baseUrl}.`
      });
    }
  }

  return {
    async createShareLink(tripId) {
      const response = await requestJson<{ share: ShareLinkRecord }>(
        `/api/trips/${encodeURIComponent(tripId)}/share`,
        {
          method: "POST"
        }
      );

      return response.share;
    },

    async createTrip(payload) {
      const response = await requestJson<{ trip: TripRecord }>("/api/trips", {
        body: JSON.stringify(payload),
        method: "POST"
      });

      return response.trip;
    },

    async exportSharedTripPdf(shareToken) {
      return requestBlob(
        `/api/share/${encodeURIComponent(shareToken)}/export/pdf`
      );
    },

    async exportTripPdf(tripId) {
      return requestBlob(`/api/trips/${encodeURIComponent(tripId)}/export/pdf`);
    },

    async generateItinerary(payload) {
      return requestJson<GenerateItineraryResponse>(
        "/api/itineraries/generate",
        {
          body: JSON.stringify(payload),
          method: "POST"
        }
      );
    },

    async getHotelSuggestions(payload) {
      return requestJson<HotelSuggestionsResponse>(
        "/api/enrichment/hotels/suggestions",
        {
          body: JSON.stringify(payload),
          method: "POST"
        }
      );
    },

    async getTrip(tripId) {
      const response = await requestJson<{ trip: TripRecord }>(
        `/api/trips/${encodeURIComponent(tripId)}`
      );

      return response.trip;
    },

    async getSharedTrip(shareToken) {
      return requestJson<SharedTripRecord>(
        `/api/share/${encodeURIComponent(shareToken)}`
      );
    },

    async listTrips() {
      const response = await requestJson<{ trips: TripRecord[] }>("/api/trips");

      return response.trips;
    },

    async updateTrip(tripId, payload) {
      const response = await requestJson<{ trip: TripRecord }>(
        `/api/trips/${encodeURIComponent(tripId)}`,
        {
          body: JSON.stringify(payload),
          method: "PATCH"
        }
      );

      return response.trip;
    }
  };
}
