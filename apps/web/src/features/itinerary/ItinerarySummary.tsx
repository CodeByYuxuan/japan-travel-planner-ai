import type { Itinerary } from "../../../../../packages/shared/src/schemas/itinerary.js";

export type ItinerarySummaryProps = {
  itinerary: Itinerary;
};

export function ItinerarySummary({ itinerary }: ItinerarySummaryProps) {
  const activityCount = itinerary.days.reduce(
    (total, day) => total + day.activities.length,
    0
  );
  const cities = Array.from(new Set(itinerary.days.map((day) => day.city)));

  return (
    <section className="itinerary-summary" aria-labelledby="itinerary-title">
      <div>
        <p className="section-kicker">Mock Itinerary</p>
        <h2 id="itinerary-title">{itinerary.title}</h2>
        <p className="itinerary-date-range">
          {itinerary.startDate} to {itinerary.endDate}
        </p>
      </div>

      <dl className="itinerary-stats" aria-label="Itinerary summary">
        <div>
          <dt>Days</dt>
          <dd>{itinerary.days.length}</dd>
        </div>
        <div>
          <dt>Activities</dt>
          <dd>{activityCount}</dd>
        </div>
        <div>
          <dt>Cities</dt>
          <dd>{cities.join(", ")}</dd>
        </div>
      </dl>
    </section>
  );
}
