import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { WeatherSummary } from "./WeatherSummary.js";

describe("WeatherSummary", () => {
  test("renders an available day weather summary string", () => {
    const html = renderToString(
      <WeatherSummary summary="Mild spring weather; bring a light jacket." />
    );

    expect(html).toContain("Weather summary");
    expect(html).toContain("Mild spring weather; bring a light jacket.");
  });

  test("renders structured weather details", () => {
    const html = renderToString(
      <WeatherSummary
        details={{
          condition: "Partly cloudy",
          note: "Comfortable for walking between temples.",
          precipitationProbabilityPercent: 20,
          temperatureMax: 21,
          temperatureMin: 12,
          temperatureUnit: "celsius"
        }}
      />
    );

    expect(html).toContain("Partly cloudy");
    expect(html).toContain("12-21 C");
    expect(html).toContain("20% precipitation chance");
    expect(html).toContain("Comfortable for walking between temples.");
  });

  test("omits missing weather by default", () => {
    const html = renderToString(<WeatherSummary summary={null} />);

    expect(html).toBe("");
  });

  test("renders a subtle missing state when requested", () => {
    const html = renderToString(<WeatherSummary showMissingState />);

    expect(html).toContain("Weather unavailable");
    expect(html).toContain("trip-day-weather-missing");
  });
});
