import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  createLineShareHref,
  createLineShareMessage,
  LineShareButton,
  lineShareBaseUrl
} from "./LineShareButton.js";

const publicShareUrl =
  "https://planner.example.com/share/public-share-token-1234567890abcdef";

describe("LINE share URL helpers", () => {
  test("creates a share message from public itinerary details only", () => {
    const message = createLineShareMessage({
      cities: ["Tokyo", "Kyoto"],
      endDate: "2026-04-08",
      shareUrl: publicShareUrl,
      startDate: "2026-04-06",
      title: "Tokyo And Kyoto Spring Highlights"
    });

    expect(message).toContain("Tokyo And Kyoto Spring Highlights");
    expect(message).toContain("Tokyo, Kyoto");
    expect(message).toContain("2026-04-06 to 2026-04-08");
    expect(message).toContain(publicShareUrl);
    expect(message).not.toContain("/api/trips/");
    expect(message).not.toContain("generated-trip-1");
  });

  test("encodes the public share URL and message text for LINE", () => {
    const href = createLineShareHref({
      cities: ["Tokyo", "Kyoto"],
      endDate: "2026-04-08",
      shareUrl: publicShareUrl,
      startDate: "2026-04-06",
      title: "Tokyo And Kyoto Spring Highlights"
    });
    const parsedHref = new URL(href);

    expect(`${parsedHref.origin}${parsedHref.pathname}`).toBe(lineShareBaseUrl);
    expect(parsedHref.searchParams.get("text")).toContain(publicShareUrl);
    expect(href).toContain(encodeURIComponent(publicShareUrl));
  });
});

describe("LineShareButton", () => {
  test("is disabled before a public share URL exists", () => {
    const html = renderToString(
      <LineShareButton disabledReason="Create a public share link first." />
    );

    expect(html).toContain("Create a public share link first.");
    expect(html).toContain("disabled");
    expect(html).not.toContain("href=");
  });

  test("opens a safe LINE target when a public share URL exists", () => {
    const html = renderToString(
      <LineShareButton
        cities={["Tokyo", "Kyoto"]}
        endDate="2026-04-08"
        shareUrl={publicShareUrl}
        startDate="2026-04-06"
        title="Tokyo And Kyoto Spring Highlights"
      />
    );

    expect(html).toContain("Share on LINE");
    expect(html).toContain("https://line.me/R/share?text=");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
