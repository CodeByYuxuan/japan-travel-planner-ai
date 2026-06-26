export type RouteTravelMode = "bicycle" | "drive" | "transit" | "walk";

export type RouteHintLocation = {
  address?: string | undefined;
  label: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
};

export type RouteHintRequest = {
  city?: string | undefined;
  departureTime?: string | undefined;
  destination: RouteHintLocation;
  locale?: string | undefined;
  maxAlternatives?: number | undefined;
  origin: RouteHintLocation;
  travelMode: RouteTravelMode;
};

export type RouteHintStep = {
  distanceMeters: number | null;
  durationMinutes: number | null;
  instruction: string | null;
  transitLineName: string | null;
  travelMode: RouteTravelMode;
};

export type RouteHint = {
  destination: RouteHintLocation;
  destinationLabel: string;
  distanceMeters: number | null;
  durationMinutes: number | null;
  id: string;
  mapUrl: string | null;
  origin: RouteHintLocation;
  originLabel: string;
  provider: string;
  sourceUpdatedAt: string | null;
  staticDurationMinutes: number | null;
  steps: RouteHintStep[];
  summary: string;
  transitLineNames: string[];
  travelMode: RouteTravelMode;
  warnings: string[];
};

export type RouteProvider = {
  getRouteHints: (input: RouteHintRequest) => Promise<RouteHint[]>;
  name: string;
};

export class RouteProviderConfigurationError extends Error {
  constructor() {
    super("Route provider is not configured.");
    this.name = "RouteProviderConfigurationError";
  }
}

export class RouteProviderError extends Error {
  constructor() {
    super("Route provider request failed.");
    this.name = "RouteProviderError";
  }
}
