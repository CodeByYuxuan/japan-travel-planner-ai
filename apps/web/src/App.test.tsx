import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { App } from "./App";

describe("App", () => {
  test("renders the responsive trip planner shell", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Japan Travel Planner");
    expect(html).toContain("Japan trip planner");
    expect(html).toContain("Plan your Japan route");
    expect(html).toContain("Create saved itinerary");
    expect(html).toContain("Use mock preview");
    expect(html).toContain("Save and reopen");
    expect(html).toContain("Refresh saved trips");
    expect(html).toContain("No itinerary yet");
    expect(html).toContain("API");
  });
});
