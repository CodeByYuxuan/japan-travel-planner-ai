import { describe, expect, test } from "vitest";

import type { Activity } from "../../../../../../packages/shared/src/schemas/itinerary.js";
import { mockItinerary } from "../../../mocks/index.js";
import {
  createItineraryEditorState,
  type ItineraryEditorState,
  itineraryEditorReducer
} from "./useItineraryEditor.js";

function getDay(state: ItineraryEditorState, date: string) {
  const day = state.itinerary?.days.find((candidate) => candidate.date === date);

  if (!day) {
    throw new Error(`Missing test day ${date}`);
  }

  return day;
}

function createTestActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    title: "Neighborhood coffee stop",
    category: "food",
    timing: {
      timeOfDay: "afternoon"
    },
    durationMinutes: 45,
    location: {
      name: "Local cafe",
      city: "Tokyo"
    },
    costLevel: "low",
    notes: "A flexible local break between larger activities.",
    ...overrides
  };
}

describe("itineraryEditorReducer", () => {
  test("adds an activity to a day without mutating the mock fixture", () => {
    const state = createItineraryEditorState(mockItinerary);
    const dayBefore = getDay(state, "2026-04-06");
    const fixtureCount = mockItinerary.days[0]?.activities.length;

    const nextState = itineraryEditorReducer(state, {
      type: "addActivity",
      dayDate: "2026-04-06",
      activity: createTestActivity()
    });
    const dayAfter = getDay(nextState, "2026-04-06");

    expect(dayAfter.activities).toHaveLength(dayBefore.activities.length + 1);
    expect(dayAfter.activities.at(-1)?.id).toBe("2026-04-06-local-13");
    expect(nextState.isDirty).toBe(true);
    expect(mockItinerary.days[0]?.activities.length).toBe(fixtureCount);
  });

  test("edits activity metadata within the requested day", () => {
    const state = createItineraryEditorState(mockItinerary);
    const original = getDay(state, "2026-04-06").activities[0];

    if (!original?.id) {
      throw new Error("Expected editable activity id");
    }

    const nextState = itineraryEditorReducer(state, {
      type: "updateActivity",
      dayDate: "2026-04-06",
      activityId: original.id,
      activity: {
        ...original,
        title: "Updated Ueno Park walk",
        costLevel: "low",
        notes: "Updated local note."
      }
    });
    const updated = getDay(nextState, "2026-04-06").activities[0];

    expect(updated?.title).toBe("Updated Ueno Park walk");
    expect(updated?.costLevel).toBe("low");
    expect(updated?.notes).toBe("Updated local note.");
    expect(updated?.id).toBe(original.id);
    expect(nextState.isDirty).toBe(true);
  });

  test("deletes an activity from a day", () => {
    const state = createItineraryEditorState(mockItinerary);
    const deletedActivity = getDay(state, "2026-04-06").activities[1];

    if (!deletedActivity?.id) {
      throw new Error("Expected editable activity id");
    }

    const nextState = itineraryEditorReducer(state, {
      type: "deleteActivity",
      dayDate: "2026-04-06",
      activityId: deletedActivity.id
    });
    const dayAfter = getDay(nextState, "2026-04-06");

    expect(dayAfter.activities.map((activity) => activity.id)).not.toContain(
      deletedActivity.id
    );
    expect(dayAfter.activities).toHaveLength(3);
    expect(nextState.isDirty).toBe(true);
  });

  test("reorders an activity within the same day", () => {
    const state = createItineraryEditorState(mockItinerary);
    const dayBefore = getDay(state, "2026-04-06");
    const movedActivity = dayBefore.activities[1];

    if (!movedActivity?.id) {
      throw new Error("Expected editable activity id");
    }

    const nextState = itineraryEditorReducer(state, {
      type: "moveActivity",
      dayDate: "2026-04-06",
      activityId: movedActivity.id,
      direction: "up"
    });
    const dayAfter = getDay(nextState, "2026-04-06");

    expect(dayAfter.activities[0]?.id).toBe(movedActivity.id);
    expect(dayAfter.activities[1]?.id).toBe(dayBefore.activities[0]?.id);
    expect(nextState.isDirty).toBe(true);
  });

  test("does not reorder activities across days", () => {
    const state = createItineraryEditorState(mockItinerary);
    const kyotoActivity = getDay(state, "2026-04-07").activities[0];

    if (!kyotoActivity?.id) {
      throw new Error("Expected editable activity id");
    }

    const nextState = itineraryEditorReducer(state, {
      type: "moveActivity",
      dayDate: "2026-04-06",
      activityId: kyotoActivity.id,
      direction: "up"
    });

    expect(getDay(nextState, "2026-04-07").activities[0]?.id).toBe(
      kyotoActivity.id
    );
    expect(getDay(nextState, "2026-04-06").activities).toEqual(
      getDay(state, "2026-04-06").activities
    );
    expect(nextState.isDirty).toBe(false);
  });

  test("clears dirty state when itinerary is reset", () => {
    const state = createItineraryEditorState(mockItinerary);
    const activity = getDay(state, "2026-04-06").activities[0];

    if (!activity?.id) {
      throw new Error("Expected editable activity id");
    }

    const dirtyState = itineraryEditorReducer(state, {
      type: "updateActivity",
      dayDate: "2026-04-06",
      activityId: activity.id,
      activity: {
        ...activity,
        title: "Dirty activity"
      }
    });
    const resetState = itineraryEditorReducer(dirtyState, {
      type: "reset",
      itinerary: mockItinerary
    });

    expect(dirtyState.isDirty).toBe(true);
    expect(resetState.isDirty).toBe(false);
  });
});
