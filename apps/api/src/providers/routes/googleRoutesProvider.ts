import { z } from "zod";

import {
  RouteProviderConfigurationError,
  RouteProviderError,
  type RouteHint,
  type RouteHintLocation,
  type RouteHintRequest,
  type RouteHintStep,
  type RouteProvider,
  type RouteTravelMode
} from "./routeProvider.js";

export type GoogleRoutesProviderOptions = {
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
  fetch?: typeof fetch | undefined;
  fieldMask?: string | undefined;
  now?: (() => Date) | undefined;
};

type GoogleTravelMode = "BICYCLE" | "DRIVE" | "TRANSIT" | "WALK";

const googleRoutesProviderName = "google-routes";
const defaultBaseUrl =
  "https://routes.googleapis.com/directions/v2:computeRoutes";
const defaultFieldMask = [
  "routes.distanceMeters",
  "routes.duration",
  "routes.staticDuration",
  "routes.legs.distanceMeters",
  "routes.legs.duration",
  "routes.legs.staticDuration",
  "routes.legs.steps.distanceMeters",
  "routes.legs.steps.staticDuration",
  "routes.legs.steps.navigationInstruction.instructions",
  "routes.legs.steps.transitDetails.transitLine.name",
  "routes.legs.steps.transitDetails.transitLine.shortName",
  "routes.legs.steps.travelMode"
].join(",");

const googleRouteStepSchema = z
  .object({
    distanceMeters: z.number().optional(),
    navigationInstruction: z
      .object({
        instructions: z.string().optional()
      })
      .passthrough()
      .optional(),
    staticDuration: z.string().optional(),
    transitDetails: z
      .object({
        transitLine: z
          .object({
            name: z.string().optional(),
            shortName: z.string().optional()
          })
          .passthrough()
          .optional()
      })
      .passthrough()
      .optional(),
    travelMode: z.string().optional()
  })
  .passthrough();

const googleRouteLegSchema = z
  .object({
    distanceMeters: z.number().optional(),
    duration: z.string().optional(),
    staticDuration: z.string().optional(),
    steps: z.array(googleRouteStepSchema).optional()
  })
  .passthrough();

const googleRouteSchema = z
  .object({
    distanceMeters: z.number().optional(),
    duration: z.string().optional(),
    legs: z.array(googleRouteLegSchema).optional(),
    staticDuration: z.string().optional()
  })
  .passthrough();

const googleRoutesResponseSchema = z
  .object({
    routes: z.array(googleRouteSchema).optional()
  })
  .passthrough();

type GoogleRoute = z.infer<typeof googleRouteSchema>;
type GoogleRouteLeg = z.infer<typeof googleRouteLegSchema>;
type GoogleRouteStep = z.infer<typeof googleRouteStepSchema>;

function cleanConfigValue(value: string | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : null;
}

function requireApiKey(apiKey: string | undefined) {
  const configuredApiKey = cleanConfigValue(apiKey);

  if (configuredApiKey === null) {
    throw new RouteProviderConfigurationError();
  }

  return configuredApiKey;
}

function routeModeToGoogleMode(mode: RouteTravelMode): GoogleTravelMode {
  if (mode === "bicycle") {
    return "BICYCLE";
  }

  if (mode === "drive") {
    return "DRIVE";
  }

  if (mode === "walk") {
    return "WALK";
  }

  return "TRANSIT";
}

function googleModeToRouteMode(
  mode: string | undefined,
  fallback: RouteTravelMode
): RouteTravelMode {
  if (mode === "BICYCLE") {
    return "bicycle";
  }

  if (mode === "DRIVE") {
    return "drive";
  }

  if (mode === "WALK") {
    return "walk";
  }

  if (mode === "TRANSIT") {
    return "transit";
  }

  return fallback;
}

function coordinatesToText(location: RouteHintLocation) {
  return location.latitude !== undefined && location.longitude !== undefined
    ? `${location.latitude},${location.longitude}`
    : null;
}

function routeLocationToWaypoint(location: RouteHintLocation) {
  if (location.latitude !== undefined && location.longitude !== undefined) {
    return {
      location: {
        latLng: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      }
    };
  }

  return {
    address: location.address ?? location.label
  };
}

function getDirectionsLocationValue(location: RouteHintLocation) {
  return coordinatesToText(location) ?? location.address ?? location.label;
}

function getGoogleMapsTravelMode(mode: RouteTravelMode) {
  if (mode === "bicycle") {
    return "bicycling";
  }

  if (mode === "drive") {
    return "driving";
  }

  if (mode === "walk") {
    return "walking";
  }

  return "transit";
}

export function createGoogleMapsDirectionsUrl(input: RouteHintRequest) {
  const url = new URL("https://www.google.com/maps/dir/");

  url.searchParams.set("api", "1");
  url.searchParams.set("origin", getDirectionsLocationValue(input.origin));
  url.searchParams.set(
    "destination",
    getDirectionsLocationValue(input.destination)
  );
  url.searchParams.set("travelmode", getGoogleMapsTravelMode(input.travelMode));

  return url.toString();
}

export function buildGoogleRoutesRequestBody(input: RouteHintRequest) {
  return {
    origin: routeLocationToWaypoint(input.origin),
    destination: routeLocationToWaypoint(input.destination),
    travelMode: routeModeToGoogleMode(input.travelMode),
    ...(input.departureTime !== undefined
      ? { departureTime: input.departureTime }
      : {}),
    ...(input.locale !== undefined ? { languageCode: input.locale } : {}),
    ...(input.maxAlternatives !== undefined && input.maxAlternatives > 1
      ? { computeAlternativeRoutes: true }
      : {})
  };
}

async function fetchRoutes(options: {
  apiKey: string;
  baseUrl: string;
  body: unknown;
  fetchImpl: typeof fetch;
  fieldMask: string;
}) {
  let response: Response;

  try {
    response = await options.fetchImpl(options.baseUrl, {
      body: JSON.stringify(options.body),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": options.apiKey,
        "X-Goog-FieldMask": options.fieldMask
      },
      method: "POST"
    });
  } catch {
    throw new RouteProviderError();
  }

  if (!response.ok) {
    throw new RouteProviderError();
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new RouteProviderError();
  }
}

function parseDurationSeconds(value: string | undefined) {
  if (value === undefined) {
    return null;
  }

  const match = value.match(/^(\d+(?:\.\d+)?)s$/);

  if (match === null) {
    return null;
  }

  const seconds = Number(match[1]);

  return Number.isFinite(seconds) ? seconds : null;
}

function secondsToMinutes(seconds: number | null) {
  if (seconds === null) {
    return null;
  }

  return Math.max(0, Math.round(seconds / 60));
}

function sumNumbers(values: Array<number | undefined>) {
  const numbers = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  );

  if (numbers.length === 0) {
    return null;
  }

  return numbers.reduce((sum, value) => sum + value, 0);
}

function firstNonNull<T>(values: Array<T | null | undefined>) {
  return (
    values.find((value): value is T => value !== null && value !== undefined) ??
    null
  );
}

function getRouteDistanceMeters(route: GoogleRoute, legs: GoogleRouteLeg[]) {
  return firstNonNull([
    route.distanceMeters,
    sumNumbers(legs.map((leg) => leg.distanceMeters))
  ]);
}

function getRouteDurationMinutes(route: GoogleRoute, legs: GoogleRouteLeg[]) {
  return secondsToMinutes(
    firstNonNull([
      parseDurationSeconds(route.duration),
      sumNumbers(
        legs.map((leg) => parseDurationSeconds(leg.duration) ?? undefined)
      )
    ])
  );
}

function getRouteStaticDurationMinutes(
  route: GoogleRoute,
  legs: GoogleRouteLeg[]
) {
  return secondsToMinutes(
    firstNonNull([
      parseDurationSeconds(route.staticDuration),
      sumNumbers(
        legs.map((leg) => parseDurationSeconds(leg.staticDuration) ?? undefined)
      )
    ])
  );
}

function getStepDurationMinutes(step: GoogleRouteStep) {
  return secondsToMinutes(parseDurationSeconds(step.staticDuration));
}

function cleanText(value: string | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : null;
}

function getTransitLineName(step: GoogleRouteStep) {
  return (
    cleanText(step.transitDetails?.transitLine?.name) ??
    cleanText(step.transitDetails?.transitLine?.shortName)
  );
}

function addUnique(values: string[], value: string | null) {
  if (value === null) {
    return;
  }

  if (
    !values.some((candidate) => candidate.toLowerCase() === value.toLowerCase())
  ) {
    values.push(value);
  }
}

function normalizeSteps(
  steps: GoogleRouteStep[],
  fallbackMode: RouteTravelMode
): RouteHintStep[] {
  return steps.map((step) => ({
    distanceMeters:
      typeof step.distanceMeters === "number" &&
      Number.isFinite(step.distanceMeters)
        ? step.distanceMeters
        : null,
    durationMinutes: getStepDurationMinutes(step),
    instruction: cleanText(step.navigationInstruction?.instructions),
    transitLineName: getTransitLineName(step),
    travelMode: googleModeToRouteMode(step.travelMode, fallbackMode)
  }));
}

function formatDistance(distanceMeters: number | null) {
  if (distanceMeters === null) {
    return null;
  }

  if (distanceMeters >= 1000) {
    return `${Math.round((distanceMeters / 1000) * 10) / 10} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}

function getTravelModeLabel(mode: RouteTravelMode) {
  if (mode === "bicycle") {
    return "Bicycle";
  }

  if (mode === "drive") {
    return "Drive";
  }

  if (mode === "walk") {
    return "Walk";
  }

  return "Transit";
}

function buildSummary(options: {
  destinationLabel: string;
  distanceMeters: number | null;
  durationMinutes: number | null;
  originLabel: string;
  transitLineNames: string[];
  travelMode: RouteTravelMode;
}) {
  const detailParts = [
    options.durationMinutes !== null
      ? `about ${options.durationMinutes} min`
      : null,
    formatDistance(options.distanceMeters),
    options.transitLineNames.length > 0
      ? `via ${options.transitLineNames.join(", ")}`
      : null
  ].filter((part): part is string => part !== null);
  const detail = detailParts.length > 0 ? `, ${detailParts.join(", ")}` : "";

  return `${getTravelModeLabel(options.travelMode)} route from ${
    options.originLabel
  } to ${options.destinationLabel}${detail}.`;
}

function createRouteHintId(input: RouteHintRequest, index: number) {
  const slug = [input.origin.label, input.destination.label, input.travelMode]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${googleRoutesProviderName}:${slug || "route"}:${index + 1}`;
}

function getModeWarnings(mode: RouteTravelMode) {
  if (mode === "bicycle" || mode === "walk") {
    return [
      "Walking and bicycle route details may be incomplete; verify locally before traveling."
    ];
  }

  return [];
}

export function normalizeGoogleRoutesResponse(
  responseBody: unknown,
  input: RouteHintRequest,
  now: Date = new Date()
): RouteHint[] {
  const parsedResponse = googleRoutesResponseSchema.safeParse(responseBody);

  if (!parsedResponse.success) {
    throw new RouteProviderError();
  }

  const routes = parsedResponse.data.routes ?? [];
  const maxAlternatives = input.maxAlternatives ?? 1;

  return routes.slice(0, maxAlternatives).map((route, index) => {
    const legs = route.legs ?? [];
    const rawSteps = legs.flatMap((leg) => leg.steps ?? []);
    const steps = normalizeSteps(rawSteps, input.travelMode);
    const transitLineNames: string[] = [];

    for (const step of steps) {
      addUnique(transitLineNames, step.transitLineName);
    }

    const distanceMeters = getRouteDistanceMeters(route, legs);
    const durationMinutes = getRouteDurationMinutes(route, legs);
    const staticDurationMinutes = getRouteStaticDurationMinutes(route, legs);

    return {
      destination: { ...input.destination },
      destinationLabel: input.destination.label,
      distanceMeters,
      durationMinutes,
      id: createRouteHintId(input, index),
      mapUrl: createGoogleMapsDirectionsUrl(input),
      origin: { ...input.origin },
      originLabel: input.origin.label,
      provider: googleRoutesProviderName,
      sourceUpdatedAt: now.toISOString(),
      staticDurationMinutes,
      steps,
      summary: buildSummary({
        destinationLabel: input.destination.label,
        distanceMeters,
        durationMinutes,
        originLabel: input.origin.label,
        transitLineNames,
        travelMode: input.travelMode
      }),
      transitLineNames,
      travelMode: input.travelMode,
      warnings: getModeWarnings(input.travelMode)
    };
  });
}

export function createGoogleRoutesProvider(
  options: GoogleRoutesProviderOptions = {}
): RouteProvider {
  const fetchImpl = options.fetch ?? fetch;
  const baseUrl = options.baseUrl ?? defaultBaseUrl;
  const fieldMask = options.fieldMask ?? defaultFieldMask;
  const now = options.now ?? (() => new Date());

  return {
    name: googleRoutesProviderName,
    async getRouteHints(input) {
      const apiKey = requireApiKey(options.apiKey);
      const responseBody = await fetchRoutes({
        apiKey,
        baseUrl,
        body: buildGoogleRoutesRequestBody(input),
        fetchImpl,
        fieldMask
      });

      return normalizeGoogleRoutesResponse(responseBody, input, now());
    }
  };
}
