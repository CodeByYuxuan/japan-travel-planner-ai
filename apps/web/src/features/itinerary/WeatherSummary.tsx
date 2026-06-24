export type WeatherSummaryDetails = {
  condition: string;
  note?: string | null | undefined;
  precipitationProbabilityPercent?: number | null | undefined;
  precipitationTotalMillimeters?: number | null | undefined;
  temperatureMax?: number | null | undefined;
  temperatureMin?: number | null | undefined;
  temperatureUnit?: "celsius" | "fahrenheit" | "kelvin" | undefined;
};

export type WeatherSummaryProps = {
  details?: WeatherSummaryDetails | null | undefined;
  showMissingState?: boolean | undefined;
  summary?: string | null | undefined;
};

function getTemperatureSymbol(
  unit: WeatherSummaryDetails["temperatureUnit"] = "celsius"
) {
  if (unit === "fahrenheit") {
    return "F";
  }

  if (unit === "kelvin") {
    return "K";
  }

  return "C";
}

function formatTemperatureRange(details: WeatherSummaryDetails) {
  const minTemperature = details.temperatureMin;
  const maxTemperature = details.temperatureMax;
  const symbol = getTemperatureSymbol(details.temperatureUnit);

  if (minTemperature !== null && minTemperature !== undefined) {
    if (maxTemperature !== null && maxTemperature !== undefined) {
      return `${minTemperature}-${maxTemperature} ${symbol}`;
    }

    return `From ${minTemperature} ${symbol}`;
  }

  if (maxTemperature !== null && maxTemperature !== undefined) {
    return `Up to ${maxTemperature} ${symbol}`;
  }

  return null;
}

function formatPrecipitation(details: WeatherSummaryDetails) {
  if (
    details.precipitationProbabilityPercent !== null &&
    details.precipitationProbabilityPercent !== undefined
  ) {
    return `${details.precipitationProbabilityPercent}% precipitation chance`;
  }

  if (
    details.precipitationTotalMillimeters !== null &&
    details.precipitationTotalMillimeters !== undefined
  ) {
    return `${details.precipitationTotalMillimeters} mm precipitation`;
  }

  return "Precipitation unknown";
}

export function WeatherSummary({
  details,
  showMissingState = false,
  summary
}: WeatherSummaryProps) {
  const trimmedSummary = summary?.trim();

  if (trimmedSummary && trimmedSummary.length > 0) {
    return (
      <p className="trip-day-weather" aria-label="Weather summary">
        {trimmedSummary}
      </p>
    );
  }

  if (details) {
    const temperatureRange = formatTemperatureRange(details);

    return (
      <section
        className="trip-day-weather weather-summary-detail"
        aria-label="Weather summary"
      >
        <p className="weather-summary-condition">{details.condition}</p>
        <dl className="weather-summary-meta">
          {temperatureRange ? (
            <div>
              <dt>Temperature</dt>
              <dd>{temperatureRange}</dd>
            </div>
          ) : null}
          <div>
            <dt>Precipitation</dt>
            <dd>{formatPrecipitation(details)}</dd>
          </div>
        </dl>
        {details.note ? (
          <p className="weather-summary-note">{details.note}</p>
        ) : null}
      </section>
    );
  }

  if (!showMissingState) {
    return null;
  }

  return (
    <p
      className="trip-day-weather trip-day-weather-missing"
      aria-label="Weather unavailable"
    >
      Weather unavailable
    </p>
  );
}
