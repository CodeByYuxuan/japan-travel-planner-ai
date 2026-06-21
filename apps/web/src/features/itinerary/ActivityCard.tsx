import type {
  Activity,
  ActivityCategory,
  ActivityCostLevel
} from "../../../../../packages/shared/src/schemas/itinerary.js";

const categoryLabels: Record<ActivityCategory, string> = {
  sightseeing: "Sightseeing",
  food: "Food",
  culture: "Culture",
  nature: "Nature",
  shopping: "Shopping",
  transit: "Transit",
  lodging: "Lodging",
  other: "Other"
};

const costLevelLabels: Record<ActivityCostLevel, string> = {
  free: "Free",
  low: "Low",
  medium: "Medium",
  high: "High"
};

const timeOfDayLabels = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night"
};

function formatTiming(activity: Activity) {
  const { endTime, startTime, timeOfDay } = activity.timing;

  if (startTime && endTime) {
    return `${startTime}-${endTime}`;
  }

  if (startTime) {
    return startTime;
  }

  return timeOfDay ? timeOfDayLabels[timeOfDay] : "Flexible";
}

export type ActivityCardProps = {
  activity: Activity;
};

export function ActivityCard({ activity }: ActivityCardProps) {
  const locationDetail =
    activity.location.address ??
    activity.location.city ??
    activity.location.name;

  return (
    <article className="activity-card">
      <div className="activity-card-header">
        <div>
          <p className="activity-time">{formatTiming(activity)}</p>
          <h4>{activity.title}</h4>
        </div>
        <span className="activity-category">
          {categoryLabels[activity.category]}
        </span>
      </div>

      <dl className="activity-meta" aria-label={`${activity.title} details`}>
        <div>
          <dt>Duration</dt>
          <dd>{activity.durationMinutes} min</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>
            <span>{activity.location.name}</span>
            <small>{locationDetail}</small>
          </dd>
        </div>
        <div>
          <dt>Cost</dt>
          <dd>{costLevelLabels[activity.costLevel]}</dd>
        </div>
      </dl>

      <p className="activity-notes">{activity.notes}</p>

      {activity.location.mapUrl ? (
        <a
          className="activity-map-link"
          href={activity.location.mapUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open map
        </a>
      ) : null}
    </article>
  );
}
