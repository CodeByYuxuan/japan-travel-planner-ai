import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { mockItinerary } from "../../../mocks/index.js";
import {
  ActivityEditorDialog,
  createDefaultActivity
} from "./ActivityEditorDialog.js";

const firstDay = mockItinerary.days[0];

if (!firstDay) {
  throw new Error("Expected a mock itinerary day");
}

describe("ActivityEditorDialog", () => {
  test("renders add activity metadata fields", () => {
    const html = renderToString(
      <ActivityEditorDialog
        activity={createDefaultActivity(firstDay)}
        day={firstDay}
        mode="add"
        onClose={() => undefined}
        onSubmit={() => undefined}
      />
    );

    expect(html).toContain("Add activity to Tokyo");
    expect(html).toContain("Title");
    expect(html).toContain("Category");
    expect(html).toContain("Duration minutes");
    expect(html).toContain("Location name");
    expect(html).toContain("Cost level");
    expect(html).toContain("Save activity");
  });

  test("renders edit activity content", () => {
    const activity = firstDay.activities[0];

    if (!activity) {
      throw new Error("Expected a mock activity");
    }

    const html = renderToString(
      <ActivityEditorDialog
        activity={activity}
        day={firstDay}
        mode="edit"
        onClose={() => undefined}
        onSubmit={() => undefined}
      />
    );

    expect(html).toContain("Edit Morning walk through Ueno Park");
    expect(html).toContain("Ueno Park");
    expect(html).toContain("seasonal blossoms around Shinobazu Pond");
  });
});
