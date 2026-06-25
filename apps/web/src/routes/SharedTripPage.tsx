import { useEffect, useMemo, useState } from "react";

import { ItineraryView } from "../features/itinerary/ItineraryView.js";
import {
  createTripApiClient,
  TripApiClientError,
  type TripApiClient
} from "../lib/api/client.js";
import {
  tripRecordToItinerary,
  type SharedTripRecord
} from "../lib/api/types.js";

export type SharedTripPageProps = {
  client?: TripApiClient | undefined;
  initialErrorMessage?: string | null | undefined;
  initialSharedTrip?: SharedTripRecord | null | undefined;
  shareToken: string;
};

function getSharedTripErrorMessage(error: unknown) {
  if (error instanceof TripApiClientError) {
    return error.message;
  }

  return "This share link could not be opened.";
}

function formatSharePermission(permission: SharedTripRecord["share"]["permission"]) {
  return permission === "read_only" ? "Read-only" : permission;
}

export function SharedTripPage({
  client,
  initialErrorMessage = null,
  initialSharedTrip,
  shareToken
}: SharedTripPageProps) {
  const defaultClient = useMemo(() => createTripApiClient(), []);
  const apiClient = client ?? defaultClient;
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialErrorMessage
  );
  const [sharedTrip, setSharedTrip] = useState<SharedTripRecord | null>(
    initialSharedTrip ?? null
  );
  const [isLoading, setIsLoading] = useState(initialSharedTrip === undefined);
  const itinerary = sharedTrip ? tripRecordToItinerary(sharedTrip.trip) : null;

  useEffect(() => {
    if (initialSharedTrip !== undefined) {
      return;
    }

    let isActive = true;

    setIsLoading(true);
    setErrorMessage(null);

    apiClient
      .getSharedTrip(shareToken)
      .then((nextSharedTrip) => {
        if (!isActive) {
          return;
        }

        setSharedTrip(nextSharedTrip);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setErrorMessage(getSharedTripErrorMessage(error));
        setSharedTrip(null);
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [apiClient, initialSharedTrip, shareToken]);

  return (
    <div className="app-shell shared-app-shell">
      <main className="app-main shared-main" aria-labelledby="shared-title">
        <section className="workspace-hero shared-hero">
          <div>
            <p className="section-kicker">Shared itinerary</p>
            <h1 id="shared-title">
              {sharedTrip?.trip.title ?? "Shared Japan trip"}
            </h1>
            <p className="workspace-state">
              This public link is read-only. It shows itinerary details without
              private editing or storage controls.
            </p>
          </div>

          <dl className="shell-status" aria-label="Shared trip status">
            <div>
              <dt>Permission</dt>
              <dd>
                {sharedTrip
                  ? formatSharePermission(sharedTrip.share.permission)
                  : "Read-only"}
              </dd>
            </div>
            <div>
              <dt>Days</dt>
              <dd>{sharedTrip?.trip.days.length ?? 0}</dd>
            </div>
            <div>
              <dt>Cities</dt>
              <dd>{sharedTrip?.trip.cities.join(", ") ?? "Loading"}</dd>
            </div>
          </dl>
        </section>

        {errorMessage ? (
          <section className="itinerary-state shared-error" role="alert">
            <p className="section-kicker">Share unavailable</p>
            <h2>Share link not available</h2>
            <p>{errorMessage}</p>
          </section>
        ) : (
          <ItineraryView itinerary={itinerary} isLoading={isLoading} />
        )}
      </main>
    </div>
  );
}
