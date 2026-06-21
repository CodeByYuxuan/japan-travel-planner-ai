import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { App } from "./App";

describe("App", () => {
  test("renders the responsive itinerary preview shell", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Japan Travel Planner");
    expect(html).toContain("Japan trip itinerary");
    expect(html).toContain("Tokyo And Kyoto Spring Highlights");
    expect(html).toContain("Morning walk through Ueno Park");
    expect(html).toContain("Preview");
  });
});
