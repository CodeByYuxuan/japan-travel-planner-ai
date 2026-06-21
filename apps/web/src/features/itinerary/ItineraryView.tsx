import type { Itinerary } from "../../../../../packages/shared/src/schemas/itinerary.js";

import { ItinerarySummary } from "./ItinerarySummary.js";
import { TripDayPanel } from "./TripDayPanel.js";

export type ItineraryViewProps = {
  itinerary?: Itinerary | null;
  isLoading?: boolean;
};

export function ItineraryView({ itinerary, isLoading }: ItineraryViewProps) {
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

  return (
    <section className="itinerary-view" aria-labelledby="itinerary-title">
      <ItinerarySummary itinerary={{ ...itinerary, days: sortedDays }} />

      <div className="trip-day-list">
        {sortedDays.map((day, index) => (
          <TripDayPanel day={day} dayNumber={index + 1} key={day.date} />
        ))}
      </div>
    </section>
  );
}
