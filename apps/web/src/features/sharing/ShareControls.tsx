import type { ShareLinkRecord } from "../../lib/api/types.js";
import { LineShareButton } from "./LineShareButton.js";

export type ShareControlsProps = {
  cities?: readonly string[] | undefined;
  disabledReason?: string | undefined;
  endDate?: string | null | undefined;
  isSharing?: boolean | undefined;
  onCreateShareLink: () => void;
  shareLink?: ShareLinkRecord | undefined;
  startDate?: string | null | undefined;
  title?: string | null | undefined;
  tripId?: string | null | undefined;
};

export function createShareUrl(token: string, origin?: string) {
  const resolvedOrigin =
    origin ??
    (typeof window === "undefined"
      ? "http://localhost:5173"
      : window.location.origin);

  return `${resolvedOrigin.replace(/\/$/, "")}/share/${encodeURIComponent(
    token
  )}`;
}

export function ShareControls({
  cities,
  disabledReason,
  endDate,
  isSharing = false,
  onCreateShareLink,
  shareLink,
  startDate,
  title,
  tripId
}: ShareControlsProps) {
  const shareUrl = shareLink ? createShareUrl(shareLink.token) : null;
  const canCreateShareLink = Boolean(tripId) && !isSharing && !disabledReason;
  const lineShareDisabledReason =
    shareUrl === null
      ? "Create a public share link before sharing on LINE."
      : disabledReason;

  async function copyShareUrl() {
    if (!shareUrl || typeof navigator === "undefined") {
      return;
    }

    await navigator.clipboard?.writeText(shareUrl);
  }

  return (
    <section aria-labelledby="share-controls-title" className="share-controls">
      <header>
        <p className="section-kicker">Public sharing</p>
        <h3 id="share-controls-title">Read-only share link</h3>
      </header>

      <p className="share-help">
        {disabledReason ??
          "Create a public read-only link for this saved itinerary."}
      </p>

      <button
        disabled={!canCreateShareLink}
        onClick={onCreateShareLink}
        type="button"
      >
        {isSharing
          ? "Creating share link"
          : shareLink
            ? "View share link"
            : "Create public link"}
      </button>

      {shareUrl ? (
        <div className="share-url-field">
          <label htmlFor="share-url">Share URL</label>
          <div>
            <input id="share-url" readOnly type="url" value={shareUrl} />
            <button onClick={copyShareUrl} type="button">
              Copy
            </button>
          </div>
        </div>
      ) : null}

      <LineShareButton
        cities={cities}
        disabledReason={lineShareDisabledReason}
        endDate={endDate}
        shareUrl={shareUrl}
        startDate={startDate}
        title={title}
      />
    </section>
  );
}
