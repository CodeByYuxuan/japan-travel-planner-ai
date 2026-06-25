import type { PdfExportFile } from "../../lib/api/types.js";

export type ExportControlsProps = {
  disabledReason?: string | undefined;
  errorMessage?: string | null | undefined;
  isExporting?: boolean | undefined;
  label?: string | undefined;
  onExportPdf: () => void;
};

export function downloadPdfFile(file: PdfExportFile) {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    return;
  }

  const objectUrl = URL.createObjectURL(file.blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = file.filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function ExportControls({
  disabledReason,
  errorMessage,
  isExporting = false,
  label = "Export PDF",
  onExportPdf
}: ExportControlsProps) {
  const isDisabled = isExporting || Boolean(disabledReason);

  return (
    <section aria-labelledby="export-controls-title" className="export-controls">
      <header>
        <p className="section-kicker">Export</p>
        <h3 id="export-controls-title">PDF itinerary</h3>
      </header>

      <p className="export-help">
        {disabledReason ?? "Download a read-only PDF copy of this itinerary."}
      </p>

      {errorMessage ? (
        <p className="export-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button disabled={isDisabled} onClick={onExportPdf} type="button">
        {isExporting ? "Preparing PDF" : label}
      </button>
    </section>
  );
}
