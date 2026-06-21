import type { TripDay } from "../../../../../packages/shared/src/schemas/itinerary.js";

import { ActivityCard } from "./ActivityCard.js";

export type TripDayPanelProps = {
  day: TripDay;
  dayNumber: number;
};

export function TripDayPanel({ day, dayNumber }: TripDayPanelProps) {
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
        <span>{day.activities.length} activities</span>
      </div>

      {day.summary ? <p className="trip-day-summary">{day.summary}</p> : null}
      {day.weatherSummary ? (
        <p className="trip-day-weather">{day.weatherSummary}</p>
      ) : null}

      <div className="activity-list">
        {day.activities.map((activity) => (
          <ActivityCard
            activity={activity}
            key={activity.id ?? activity.title}
          />
        ))}
      </div>
    </section>
  );
}
