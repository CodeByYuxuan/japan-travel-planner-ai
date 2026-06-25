import type { HotelSuggestion } from "../../lib/api/types.js";

export type HotelSuggestionsStatus =
  | "available"
  | "empty"
  | "error"
  | "idle"
  | "loading"
  | "unavailable";

export type HotelSuggestionsProps = {
  disabledReason?: string | undefined;
  errorMessage?: string | null | undefined;
  onLoadSuggestions?: (() => void) | undefined;
  suggestions?: HotelSuggestion[] | undefined;
  targetCity?: string | null | undefined;
  status?: HotelSuggestionsStatus | undefined;
};

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      currency,
      maximumFractionDigits: 0,
      style: "currency"
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

function getProviderLabel(provider: string) {
  if (provider === "rakuten-travel") {
    return "Rakuten Travel";
  }

  return provider;
}

function getStatusMessage(options: {
  disabledReason?: string | undefined;
  errorMessage?: string | null | undefined;
  status: HotelSuggestionsStatus;
  targetCity?: string | null | undefined;
}) {
  if (options.disabledReason) {
    return options.disabledReason;
  }

  if (options.status === "loading") {
    return "Searching hotels";
  }

  if (options.status === "empty") {
    return `No hotel suggestions found${
      options.targetCity ? ` for ${options.targetCity}` : ""
    }.`;
  }

  if (options.status === "unavailable") {
    return "Hotel suggestions are temporarily unavailable.";
  }

  if (options.status === "error") {
    return options.errorMessage ?? "Hotel suggestions could not be loaded.";
  }

  return options.targetCity
    ? `Search hotel ideas near ${options.targetCity}.`
    : "Create an itinerary before searching hotels.";
}

export function HotelSuggestions({
  disabledReason,
  errorMessage,
  onLoadSuggestions,
  suggestions = [],
  targetCity,
  status = "idle"
}: HotelSuggestionsProps) {
  const isLoading = status === "loading";
  const isDisabled = isLoading || Boolean(disabledReason) || !onLoadSuggestions;
  const statusMessage = getStatusMessage({
    disabledReason,
    errorMessage,
    status,
    targetCity
  });

  return (
    <section
      aria-labelledby="hotel-suggestions-title"
      className="hotel-suggestions"
    >
      <header>
        <p className="section-kicker">Hotels</p>
        <h3 id="hotel-suggestions-title">Hotel suggestions</h3>
      </header>

      <p
        className={
          status === "error" || status === "unavailable"
            ? "hotel-suggestions-alert"
            : "hotel-suggestions-help"
        }
        role={
          status === "error" || status === "unavailable" ? "alert" : undefined
        }
      >
        {statusMessage}
      </p>

      <button disabled={isDisabled} onClick={onLoadSuggestions} type="button">
        {isLoading ? "Searching hotels" : "Find hotels"}
      </button>

      {status === "available" && suggestions.length > 0 ? (
        <div className="hotel-suggestion-list">
          {suggestions.map((suggestion) => (
            <article className="hotel-suggestion-card" key={suggestion.id}>
              {(suggestion.thumbnailUrl ?? suggestion.imageUrl) ? (
                <img
                  alt=""
                  className="hotel-suggestion-image"
                  src={suggestion.thumbnailUrl ?? suggestion.imageUrl ?? ""}
                />
              ) : null}

              <div className="hotel-suggestion-body">
                <p className="hotel-suggestion-provider">
                  {getProviderLabel(suggestion.provider)}
                </p>
                <h4>{suggestion.name}</h4>
                {suggestion.description ? (
                  <p>{suggestion.description}</p>
                ) : null}

                <dl className="hotel-suggestion-meta">
                  {suggestion.priceFrom !== null ? (
                    <div>
                      <dt>From</dt>
                      <dd>
                        {formatCurrency(
                          suggestion.priceFrom,
                          suggestion.currency
                        )}
                      </dd>
                    </div>
                  ) : null}
                  {suggestion.rating !== null ? (
                    <div>
                      <dt>Rating</dt>
                      <dd>
                        {suggestion.rating}
                        {suggestion.reviewCount !== null
                          ? ` (${suggestion.reviewCount})`
                          : ""}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {suggestion.address ? (
                  <p className="hotel-suggestion-address">
                    {suggestion.address}
                  </p>
                ) : null}
                {suggestion.access ? (
                  <p className="hotel-suggestion-access">{suggestion.access}</p>
                ) : null}

                {suggestion.tags.length > 0 ? (
                  <ul className="hotel-suggestion-tags" aria-label="Hotel tags">
                    {suggestion.tags.slice(0, 3).map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="hotel-suggestion-links">
                  {suggestion.bookingUrl ? (
                    <a
                      href={suggestion.bookingUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Booking page
                    </a>
                  ) : null}
                  {suggestion.mapUrl ? (
                    <a
                      href={suggestion.mapUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Map
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
