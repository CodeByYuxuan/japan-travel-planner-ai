import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { App } from "./App";

describe("App", () => {
  test("renders the responsive trip planner shell", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Japan Travel Planner");
    expect(html).toContain("Japan trip planner");
    expect(html).toContain("Plan your Japan route");
    expect(html).toContain("Generate mock itinerary");
    expect(html).toContain("No itinerary yet");
    expect(html).toContain("Input");
  });
});
