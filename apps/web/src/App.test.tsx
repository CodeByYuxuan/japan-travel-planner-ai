import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { App, getShareTokenFromPathname } from "./App";

describe("App", () => {
  test("renders the responsive trip planner shell", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Japan Travel Planner");
    expect(html).toContain("Japan trip planner");
    expect(html).toContain("Plan your Japan route");
    expect(html).toContain("Generate AI itinerary");
    expect(html).toContain("Use mock preview");
    expect(html).toContain("Save and reopen");
    expect(html).toContain("Revert local edits");
    expect(html).toContain("Refresh saved trips");
    expect(html).toContain("PDF itinerary");
    expect(html).toContain("Save this itinerary before exporting a PDF.");
    expect(html).toContain("Read-only share link");
    expect(html).toContain("Save this itinerary before creating a public share link.");
    expect(html).toContain("No itinerary yet");
    expect(html).toContain("API");
  });

  test("parses public share route tokens without adding a router dependency", () => {
    expect(
      getShareTokenFromPathname(
        "/share/public-share-token-1234567890abcdef"
      )
    ).toBe("public-share-token-1234567890abcdef");
    expect(getShareTokenFromPathname("/")).toBeNull();
  });
});
