import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { createShareUrl, ShareControls } from "./ShareControls.js";

const shareLink = {
  token: "public-share-token-1234567890abcdef",
  permission: "read_only" as const,
  expiresAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

function getFirstHref(html: string) {
  const href = html.match(/href="([^"]+)"/)?.[1];

  if (!href) {
    throw new Error("Expected rendered HTML to contain a link href.");
  }

  return href.replaceAll("&amp;", "&");
}

describe("ShareControls", () => {
  test("is explanatory and disabled before a saved trip exists", () => {
    const html = renderToString(
      <ShareControls
        disabledReason="Save this itinerary before creating a public share link."
        onCreateShareLink={() => undefined}
        tripId={null}
      />
    );

    expect(html).toContain("Read-only share link");
    expect(html).toContain(
      "Save this itinerary before creating a public share link."
    );
    expect(html).toContain("disabled");
    expect(html).not.toContain("Share URL");
    expect(html).toContain("Share on LINE");
    expect(html).toContain(
      "Create a public share link before sharing on LINE."
    );
  });

  test("renders a copyable public share URL for a saved trip", () => {
    const html = renderToString(
      <ShareControls
        cities={["Tokyo", "Kyoto"]}
        endDate="2026-04-08"
        onCreateShareLink={() => undefined}
        shareLink={shareLink}
        startDate="2026-04-06"
        title="Tokyo And Kyoto Spring Highlights"
        tripId="trip-1"
      />
    );

    expect(html).toContain("Share URL");
    expect(html).toContain(
      "http://localhost:5173/share/public-share-token-1234567890abcdef"
    );
    expect(html).toContain("readOnly");
    expect(html).toContain("Copy");
    expect(html).toContain("Share on LINE");
  });

  test("uses the same public read-only share URL for LINE", () => {
    const html = renderToString(
      <ShareControls
        cities={["Tokyo", "Kyoto"]}
        endDate="2026-04-08"
        onCreateShareLink={() => undefined}
        shareLink={shareLink}
        startDate="2026-04-06"
        title="Tokyo And Kyoto Spring Highlights"
        tripId="trip-1"
      />
    );
    const lineShareUrl = new URL(getFirstHref(html));

    expect(`${lineShareUrl.origin}${lineShareUrl.pathname}`).toBe(
      "https://line.me/R/share"
    );
    expect(lineShareUrl.searchParams.get("text")).toContain(
      "http://localhost:5173/share/public-share-token-1234567890abcdef"
    );
  });

  test("disables LINE sharing for dirty local edits", () => {
    const html = renderToString(
      <ShareControls
        disabledReason="Save local edits before sharing the itinerary."
        onCreateShareLink={() => undefined}
        shareLink={shareLink}
        tripId="trip-1"
      />
    );

    expect(html).toContain("Save local edits before sharing the itinerary.");
    expect(html).toContain("Share URL");
    expect(html).toContain("disabled");
    expect(html).not.toContain("https://line.me/R/share");
  });
});

describe("createShareUrl", () => {
  test("creates an app-local public share route", () => {
    expect(
      createShareUrl(
        "public-share-token-1234567890abcdef",
        "https://travel.example.com/"
      )
    ).toBe(
      "https://travel.example.com/share/public-share-token-1234567890abcdef"
    );
  });
});
