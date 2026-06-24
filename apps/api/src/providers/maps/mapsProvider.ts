export type MapLinkLocationInput = {
  address?: string | undefined;
  city?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  name?: string | undefined;
};

export type MapLinkInput = {
  location?: MapLinkLocationInput | undefined;
  title?: string | undefined;
};

export type MapsProvider = {
  createSearchLink: (input: MapLinkInput) => string | null;
};

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

function getCoordinateQuery(location: MapLinkLocationInput | undefined) {
  if (
    location?.latitude === undefined ||
    location.longitude === undefined ||
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude)
  ) {
    return null;
  }

  return `${location.latitude},${location.longitude}`;
}

export function buildGoogleMapsSearchQuery(input: MapLinkInput) {
  const coordinateQuery = getCoordinateQuery(input.location);

  if (coordinateQuery !== null) {
    return coordinateQuery;
  }

  const locationParts = [
    cleanText(input.location?.address),
    cleanText(input.location?.name),
    cleanText(input.location?.city)
  ].filter((part): part is string => part !== null);

  if (locationParts.length === 0) {
    return null;
  }

  const queryParts: string[] = [];

  addUniquePart(queryParts, cleanText(input.title));
  for (const locationPart of locationParts) {
    addUniquePart(queryParts, locationPart);
  }

  return queryParts.join(" ");
}

export function createGoogleMapsSearchUrl(query: string) {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length === 0) {
    return null;
  }

  return `${googleMapsSearchBaseUrl}${encodeURIComponent(trimmedQuery)}`;
}

export function createGoogleMapsSearchLink(input: MapLinkInput) {
  const query = buildGoogleMapsSearchQuery(input);

  return query === null ? null : createGoogleMapsSearchUrl(query);
}

export function createGoogleMapsProvider(): MapsProvider {
  return {
    createSearchLink: createGoogleMapsSearchLink
  };
}
