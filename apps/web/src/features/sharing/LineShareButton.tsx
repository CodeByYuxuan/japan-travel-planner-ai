export type LineShareMessageInput = {
  cities?: readonly string[] | undefined;
  endDate?: string | null | undefined;
  shareUrl: string;
  startDate?: string | null | undefined;
  title?: string | null | undefined;
};

export type LineShareButtonProps = Omit<LineShareMessageInput, "shareUrl"> & {
  disabledReason?: string | undefined;
  shareUrl?: string | null | undefined;
};

export const lineShareBaseUrl = "https://line.me/R/share";

function cleanText(value: string | null | undefined) {
  return value?.trim() || null;
}

function createDateSummary(
  startDate: string | null | undefined,
  endDate: string | null | undefined
) {
  const cleanStartDate = cleanText(startDate);
  const cleanEndDate = cleanText(endDate);

  if (cleanStartDate && cleanEndDate) {
    return `${cleanStartDate} to ${cleanEndDate}`;
  }

  return cleanStartDate ?? cleanEndDate;
}

export function createLineShareMessage({
  cities = [],
  endDate,
  shareUrl,
  startDate,
  title
}: LineShareMessageInput) {
  const citySummary = cities.map(cleanText).filter(Boolean).join(", ");
  const dateSummary = createDateSummary(startDate, endDate);
  const tripSummary = [citySummary, dateSummary].filter(Boolean).join(" - ");

  return [
    cleanText(title) ?? "Japan itinerary",
    tripSummary,
    `Read-only itinerary: ${shareUrl}`
  ]
    .filter(Boolean)
    .join("\n");
}

export function createLineShareUrl(message: string) {
  return `${lineShareBaseUrl}?text=${encodeURIComponent(message)}`;
}

export function createLineShareHref(input: LineShareMessageInput) {
  return createLineShareUrl(createLineShareMessage(input));
}

export function LineShareButton({
  cities,
  disabledReason,
  endDate,
  shareUrl,
  startDate,
  title
}: LineShareButtonProps) {
  const lineShareHref = shareUrl
    ? createLineShareHref({
        cities,
        endDate,
        shareUrl,
        startDate,
        title
      })
    : null;

  return (
    <div className="line-share">
      <div>
        <p className="line-share-label">LINE</p>
        <p className="line-share-help">
          {disabledReason ??
            "Share the public read-only itinerary through LINE."}
        </p>
      </div>

      {lineShareHref && !disabledReason ? (
        <a
          aria-label="Share this read-only itinerary on LINE"
          className="line-share-link"
          href={lineShareHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          Share on LINE
        </a>
      ) : (
        <button disabled type="button">
          Share on LINE
        </button>
      )}
    </div>
  );
}
