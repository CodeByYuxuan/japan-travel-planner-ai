import type { Activity } from "../../../../../packages/shared/src/schemas/itinerary.js";

const googleMapsSearchBaseUrl =
  "https://www.google.com/maps/search/?api=1&query=";

function cleanText(value: string | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : null;
}

function addUniquePart(parts: string[], value: string | null) {
  if (value === null) {
    return;
  }

  if (!parts.some((part) => part.toLowerCase() === value.toLowerCase())) {
    parts.push(value);
  }
}

function getCoordinateQuery(activity: Activity) {
  const { latitude, longitude } = activity.location;

  if (
    latitude === undefined ||
    longitude === undefined ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return `${latitude},${longitude}`;
}

export function createActivityGoogleMapsUrl(activity: Activity) {
  const coordinateQuery = getCoordinateQuery(activity);

  if (coordinateQuery !== null) {
    return `${googleMapsSearchBaseUrl}${encodeURIComponent(coordinateQuery)}`;
  }

  const locationParts = [
    cleanText(activity.location.address),
    cleanText(activity.location.name),
    cleanText(activity.location.city)
  ].filter((part): part is string => part !== null);

  if (locationParts.length === 0) {
    return null;
  }

  const queryParts: string[] = [];

  addUniquePart(queryParts, cleanText(activity.title));
  for (const locationPart of locationParts) {
    addUniquePart(queryParts, locationPart);
  }

  return `${googleMapsSearchBaseUrl}${encodeURIComponent(
    queryParts.join(" ")
  )}`;
}
