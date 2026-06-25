export type HotelSearchBudget = "budget" | "moderate" | "luxury";

export type HotelSuggestionRequest = {
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

export type HotelProvider = {
  name: string;
  searchHotels: (input: HotelSuggestionRequest) => Promise<HotelSuggestion[]>;
};

export class HotelProviderConfigurationError extends Error {
  constructor() {
    super("Hotel provider is not configured.");
    this.name = "HotelProviderConfigurationError";
  }
}

export class HotelProviderError extends Error {
  constructor() {
    super("Hotel provider request failed.");
    this.name = "HotelProviderError";
  }
}
