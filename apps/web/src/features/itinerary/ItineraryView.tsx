import { useState } from "react";

import type {
  Activity,
  Itinerary,
  TripDay
} from "../../../../../packages/shared/src/schemas/itinerary.js";

import { ItinerarySummary } from "./ItinerarySummary.js";
import { TripDayPanel } from "./TripDayPanel.js";
import {
  ActivityEditorDialog,
  createDefaultActivity
} from "./editing/ActivityEditorDialog.js";
import type { ReorderDirection } from "./editing/useItineraryEditor.js";

export type ItineraryEditingControls = {
  isDirty: boolean;
  onAddActivity: (dayDate: string, activity: Activity) => void;
  onDeleteActivity: (dayDate: string, activityId: string) => void;
  onMoveActivity: (
    dayDate: string,
    activityId: string,
    direction: ReorderDirection
  ) => void;
  onUpdateActivity: (
    dayDate: string,
    activityId: string,
    activity: Activity
  ) => void;
};

type ActivityEditorState = {
  activity: Activity;
  activityId?: string;
  day: TripDay;
  mode: "add" | "edit";
};

export type ItineraryViewProps = {
  editing?: ItineraryEditingControls | undefined;
  itinerary?: Itinerary | null | undefined;
  isLoading?: boolean | undefined;
};

export function ItineraryView({
  editing,
  itinerary,
  isLoading
}: ItineraryViewProps) {
  const [activityEditor, setActivityEditor] =
    useState<ActivityEditorState | null>(null);

  if (isLoading) {
    return (
      <section className="itinerary-state" aria-busy="true">
        <p className="section-kicker">Loading</p>
        <h2>Preparing itinerary</h2>
        <p>Trip results will appear here when the itinerary data is ready.</p>
      </section>
    );
  }

  if (!itinerary || itinerary.days.length === 0) {
    return (
      <section className="itinerary-state">
        <p className="section-kicker">Empty</p>
        <h2>No itinerary yet</h2>
        <p>The itinerary board is ready for generated or mock trip data.</p>
      </section>
    );
  }

  const sortedDays = [...itinerary.days].sort((left, right) =>
    left.date.localeCompare(right.date)
  );

  function openAddActivity(day: TripDay) {
    setActivityEditor({
      activity: createDefaultActivity(day),
      day,
      mode: "add"
    });
  }

  function openEditActivity(day: TripDay, activity: Activity) {
    if (!activity.id) {
      return;
    }

    setActivityEditor({
      activity,
      activityId: activity.id,
      day,
      mode: "edit"
    });
  }

  function saveActivity(activity: Activity) {
    if (!activityEditor || !editing) {
      return;
    }

    if (activityEditor.mode === "add") {
      editing.onAddActivity(activityEditor.day.date, activity);
    } else if (activityEditor.activityId) {
      editing.onUpdateActivity(
        activityEditor.day.date,
        activityEditor.activityId,
        activity
      );
    }

    setActivityEditor(null);
  }

  return (
    <section className="itinerary-view" aria-labelledby="itinerary-title">
      {editing?.isDirty ? (
        <p className="itinerary-dirty-state" role="status">
          Unsaved local edits
        </p>
      ) : null}

      <ItinerarySummary itinerary={{ ...itinerary, days: sortedDays }} />

      <div className="trip-day-list">
        {sortedDays.map((day, index) => (
          <TripDayPanel
            day={day}
            dayNumber={index + 1}
            editing={
              editing
                ? {
                    onAddActivity: () => openAddActivity(day),
                    onDeleteActivity: (activityId) =>
                      editing.onDeleteActivity(day.date, activityId),
                    onEditActivity: (activity) =>
                      openEditActivity(day, activity),
                    onMoveActivity: (activityId, direction) =>
                      editing.onMoveActivity(day.date, activityId, direction)
                  }
                : undefined
            }
            key={day.date}
          />
        ))}
      </div>

      {activityEditor ? (
        <ActivityEditorDialog
          activity={activityEditor.activity}
          day={activityEditor.day}
          key={`${activityEditor.mode}-${activityEditor.day.date}-${
            activityEditor.activity.id ?? "new"
          }`}
          mode={activityEditor.mode}
          onClose={() => setActivityEditor(null)}
          onSubmit={saveActivity}
        />
      ) : null}
    </section>
  );
}
