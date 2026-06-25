import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ExportControls } from "./ExportControls.js";

describe("ExportControls", () => {
  test("is explanatory and disabled before a saved trip exists", () => {
    const html = renderToString(
      <ExportControls
        disabledReason="Save this itinerary before exporting a PDF."
        onExportPdf={() => undefined}
      />
    );

    expect(html).toContain("PDF itinerary");
    expect(html).toContain("Save this itinerary before exporting a PDF.");
    expect(html).toContain("disabled");
  });

  test("renders a recoverable export error", () => {
    const html = renderToString(
      <ExportControls
        errorMessage="PDF export could not be generated."
        onExportPdf={() => undefined}
      />
    );

    expect(html).toContain("PDF export could not be generated.");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Export PDF");
  });

  test("supports a shared-page export label", () => {
    const html = renderToString(
      <ExportControls
        label="Export shared PDF"
        onExportPdf={() => undefined}
      />
    );

    expect(html).toContain("Export shared PDF");
    expect(html).toContain("Download a read-only PDF copy of this itinerary.");
  });
});
