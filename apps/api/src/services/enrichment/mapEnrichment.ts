import type { Activity } from "@japan-travel-planner/shared";

import {
  createGoogleMapsProvider,
  type MapLinkInput,
  type MapsProvider
} from "../../providers/maps/mapsProvider.js";

const defaultMapsProvider = createGoogleMapsProvider();

export function activityToMapLinkInput(activity: Activity): MapLinkInput {
  return {
    title: activity.title,
    location: {
      address: activity.location.address,
      city: activity.location.city,
      latitude: activity.location.latitude,
      longitude: activity.location.longitude,
      name: activity.location.name
    }
  };
}

export function createMapLink(
  input: MapLinkInput,
  provider: MapsProvider = defaultMapsProvider
) {
  try {
    return provider.createSearchLink(input);
  } catch {
    return null;
  }
}

export function getActivityMapUrl(
  activity: Activity,
  provider: MapsProvider = defaultMapsProvider
) {
  const existingMapUrl = activity.location.mapUrl?.trim();

  if (existingMapUrl && existingMapUrl.length > 0) {
    return existingMapUrl;
  }

  return createMapLink(activityToMapLinkInput(activity), provider);
}

export function enrichActivityWithMapLink(
  activity: Activity,
  provider: MapsProvider = defaultMapsProvider
): Activity {
  const mapUrl = getActivityMapUrl(activity, provider);

  if (mapUrl === null) {
    return {
      ...activity,
      location: { ...activity.location }
    };
  }

  return {
    ...activity,
    location: {
      ...activity.location,
      mapUrl
    }
  };
}
