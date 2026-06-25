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
  });

  test("renders a copyable public share URL for a saved trip", () => {
    const html = renderToString(
      <ShareControls
        onCreateShareLink={() => undefined}
        shareLink={shareLink}
        tripId="trip-1"
      />
    );

    expect(html).toContain("Share URL");
    expect(html).toContain(
      "http://localhost:5173/share/public-share-token-1234567890abcdef"
    );
    expect(html).toContain("readOnly");
    expect(html).toContain("Copy");
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
