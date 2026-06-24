import type {
  Activity,
  TripDay
} from "../../../../../packages/shared/src/schemas/itinerary.js";

import { ActivityCard } from "./ActivityCard.js";
import { WeatherSummary } from "./WeatherSummary.js";
import type { ReorderDirection } from "./editing/useItineraryEditor.js";

export type TripDayEditingControls = {
  onAddActivity: () => void;
  onDeleteActivity: (activityId: string) => void;
  onEditActivity: (activity: Activity) => void;
  onMoveActivity: (activityId: string, direction: ReorderDirection) => void;
};

export type TripDayPanelProps = {
  day: TripDay;
  dayNumber: number;
  editing?: TripDayEditingControls | undefined;
};

export function TripDayPanel({ day, dayNumber, editing }: TripDayPanelProps) {
  return (
    <section
      className="trip-day-panel"
      aria-labelledby={`trip-day-${day.date}`}
    >
      <div className="trip-day-heading">
        <div>
          <p className="trip-day-date">{day.date}</p>
          <h3 id={`trip-day-${day.date}`}>
            Day {dayNumber}: {day.city}
          </h3>
        </div>
        <div className="trip-day-actions">
          <span>{day.activities.length} activities</span>
          {editing ? (
            <button
              aria-label={`Add activity to Day ${dayNumber}: ${day.city}`}
              onClick={editing.onAddActivity}
              type="button"
            >
              Add activity
            </button>
          ) : null}
        </div>
      </div>

      {day.summary ? <p className="trip-day-summary">{day.summary}</p> : null}
      <WeatherSummary summary={day.weatherSummary} />

      <div className="activity-list">
        {day.activities.map((activity, index) => {
          const activityId = activity.id;

          return (
            <ActivityCard
              activity={activity}
              editingControls={
                editing && activityId
                  ? {
                      canDelete: day.activities.length > 1,
                      onDelete: () => editing.onDeleteActivity(activityId),
                      onEdit: () => editing.onEditActivity(activity),
                      reorder: {
                        canMoveDown: index < day.activities.length - 1,
                        canMoveUp: index > 0,
                        onMove: (direction) =>
                          editing.onMoveActivity(activityId, direction)
                      }
                    }
                  : undefined
              }
              key={activity.id ?? activity.title}
            />
          );
        })}
      </div>
    </section>
  );
}
