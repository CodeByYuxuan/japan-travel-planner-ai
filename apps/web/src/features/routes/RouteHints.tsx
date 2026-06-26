import type { RouteHint, RouteTravelMode } from "../../lib/api/types.js";

export type RouteHintsStatus =
  | "available"
  | "empty"
  | "error"
  | "idle"
  | "loading"
  | "unavailable";

export type RouteHintsProps = {
  destinationLabel?: string | null | undefined;
  disabledReason?: string | undefined;
  errorMessage?: string | null | undefined;
  onLoadRouteHints?: (() => void) | undefined;
  originLabel?: string | null | undefined;
  routeHints?: RouteHint[] | undefined;
  status?: RouteHintsStatus | undefined;
};

const travelModeLabels: Record<RouteTravelMode, string> = {
  bicycle: "Bicycle",
  drive: "Drive",
  transit: "Transit",
  walk: "Walk"
};

function formatDistance(distanceMeters: number | null) {
  if (distanceMeters === null) {
    return "Unknown";
  }

  if (distanceMeters >= 1000) {
    return `${Math.round((distanceMeters / 1000) * 10) / 10} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}

function formatDuration(durationMinutes: number | null) {
  return durationMinutes === null ? "Unknown" : `${durationMinutes} min`;
}

function getStatusMessage(options: {
  destinationLabel?: string | null | undefined;
  disabledReason?: string | undefined;
  errorMessage?: string | null | undefined;
  originLabel?: string | null | undefined;
  status: RouteHintsStatus;
}) {
  if (options.disabledReason) {
    return options.disabledReason;
  }

  if (options.status === "loading") {
    return "Finding route hint";
  }

  if (options.status === "empty") {
    return "No route hint was found for these locations.";
  }

  if (options.status === "unavailable") {
    return "Route hints are temporarily unavailable.";
  }

  if (options.status === "error") {
    return options.errorMessage ?? "Route hints could not be loaded.";
  }

  if (options.originLabel && options.destinationLabel) {
    return `Find a route hint from ${options.originLabel} to ${options.destinationLabel}.`;
  }

  return "Create an itinerary with at least two located activities before searching routes.";
}

export function RouteHints({
  destinationLabel,
  disabledReason,
  errorMessage,
  onLoadRouteHints,
  originLabel,
  routeHints = [],
  status = "idle"
}: RouteHintsProps) {
  const isLoading = status === "loading";
  const isDisabled = isLoading || Boolean(disabledReason) || !onLoadRouteHints;
  const statusMessage = getStatusMessage({
    destinationLabel,
    disabledReason,
    errorMessage,
    originLabel,
    status
  });

  return (
    <section aria-labelledby="route-hints-title" className="route-hints">
      <header>
        <p className="section-kicker">Routes</p>
        <h3 id="route-hints-title">Route hints</h3>
      </header>

      <p
        className={
          status === "error" || status === "unavailable"
            ? "route-hints-alert"
            : "route-hints-help"
        }
        role={
          status === "error" || status === "unavailable" ? "alert" : undefined
        }
      >
        {statusMessage}
      </p>

      <button disabled={isDisabled} onClick={onLoadRouteHints} type="button">
        {isLoading ? "Finding route" : "Find route"}
      </button>

      {status === "available" && routeHints.length > 0 ? (
        <div className="route-hint-list">
          {routeHints.map((routeHint) => (
            <article className="route-hint-card" key={routeHint.id}>
              <p className="route-hint-mode">
                {travelModeLabels[routeHint.travelMode]}
              </p>
              <h4>
                {routeHint.originLabel} to {routeHint.destinationLabel}
              </h4>
              <p>{routeHint.summary}</p>

              <dl className="route-hint-meta">
                <div>
                  <dt>Duration</dt>
                  <dd>{formatDuration(routeHint.durationMinutes)}</dd>
                </div>
                <div>
                  <dt>Distance</dt>
                  <dd>{formatDistance(routeHint.distanceMeters)}</dd>
                </div>
                <div>
                  <dt>Mode</dt>
                  <dd>{travelModeLabels[routeHint.travelMode]}</dd>
                </div>
              </dl>

              {routeHint.transitLineNames.length > 0 ? (
                <ul className="route-hint-lines" aria-label="Transit lines">
                  {routeHint.transitLineNames.map((lineName) => (
                    <li key={lineName}>{lineName}</li>
                  ))}
                </ul>
              ) : null}

              {routeHint.warnings.length > 0 ? (
                <ul className="route-hint-warnings" aria-label="Route warnings">
                  {routeHint.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}

              {routeHint.steps.length > 0 ? (
                <ol className="route-hint-steps" aria-label="Route steps">
                  {routeHint.steps.slice(0, 4).map((step, index) => (
                    <li
                      key={`${routeHint.id}-${index}-${step.instruction ?? step.travelMode}`}
                    >
                      <span>
                        {step.instruction ??
                          `${travelModeLabels[step.travelMode]} segment`}
                      </span>
                      <small>
                        {formatDuration(step.durationMinutes)}
                        {step.transitLineName
                          ? ` - ${step.transitLineName}`
                          : ""}
                      </small>
                    </li>
                  ))}
                </ol>
              ) : null}

              {routeHint.mapUrl ? (
                <a href={routeHint.mapUrl} rel="noreferrer" target="_blank">
                  Open route map
                </a>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
