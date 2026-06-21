import { type FormEvent, useState } from "react";

import {
  activitySchema,
  type Activity,
  type ActivityCategory,
  type ActivityCostLevel,
  type TripDay
} from "../../../../../../packages/shared/src/schemas/itinerary.js";

export type ActivityEditorMode = "add" | "edit";

export type ActivityEditorDialogProps = {
  activity: Activity;
  day: TripDay;
  mode: ActivityEditorMode;
  onClose: () => void;
  onSubmit: (activity: Activity) => void;
};

type ActivityEditorFormValues = {
  title: string;
  category: ActivityCategory;
  startTime: string;
  endTime: string;
  timeOfDay: Activity["timing"]["timeOfDay"] | "";
  durationMinutes: string;
  locationName: string;
  locationAddress: string;
  locationCity: string;
  mapUrl: string;
  costLevel: ActivityCostLevel;
  notes: string;
};

type ActivityEditorErrors = Partial<
  Record<keyof ActivityEditorFormValues, string>
>;

const categoryOptions = [
  { label: "Sightseeing", value: "sightseeing" },
  { label: "Food", value: "food" },
  { label: "Culture", value: "culture" },
  { label: "Nature", value: "nature" },
  { label: "Shopping", value: "shopping" },
  { label: "Transit", value: "transit" },
  { label: "Lodging", value: "lodging" },
  { label: "Other", value: "other" }
] satisfies Array<{ label: string; value: ActivityCategory }>;

const costLevelOptions = [
  { label: "Free", value: "free" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" }
] satisfies Array<{ label: string; value: ActivityCostLevel }>;

const timeOfDayOptions = [
  { label: "Flexible", value: "" },
  { label: "Morning", value: "morning" },
  { label: "Afternoon", value: "afternoon" },
  { label: "Evening", value: "evening" },
  { label: "Night", value: "night" }
] satisfies Array<{
  label: string;
  value: ActivityEditorFormValues["timeOfDay"];
}>;

function toFormValues(activity: Activity): ActivityEditorFormValues {
  return {
    title: activity.title,
    category: activity.category,
    startTime: activity.timing.startTime ?? "",
    endTime: activity.timing.endTime ?? "",
    timeOfDay: activity.timing.timeOfDay ?? "",
    durationMinutes: String(activity.durationMinutes),
    locationName: activity.location.name,
    locationAddress: activity.location.address ?? "",
    locationCity: activity.location.city ?? "",
    mapUrl: activity.location.mapUrl ?? "",
    costLevel: activity.costLevel,
    notes: activity.notes
  };
}

function buildActivity(
  existingActivity: Activity,
  values: ActivityEditorFormValues
) {
  const location = {
    name: values.locationName.trim(),
    ...(values.locationAddress.trim()
      ? { address: values.locationAddress.trim() }
      : {}),
    ...(values.locationCity.trim() ? { city: values.locationCity.trim() } : {}),
    ...(values.mapUrl.trim() ? { mapUrl: values.mapUrl.trim() } : {})
  };
  const timing = {
    ...(values.startTime ? { startTime: values.startTime } : {}),
    ...(values.endTime ? { endTime: values.endTime } : {}),
    ...(values.timeOfDay ? { timeOfDay: values.timeOfDay } : {})
  };

  return {
    ...(existingActivity.id ? { id: existingActivity.id } : {}),
    title: values.title.trim(),
    category: values.category,
    timing,
    durationMinutes: Number(values.durationMinutes),
    location,
    costLevel: values.costLevel,
    notes: values.notes.trim()
  };
}

function getValidationErrors(activity: Activity) {
  const result = activitySchema.safeParse(activity);
  const errors: ActivityEditorErrors = {};

  if (result.success) {
    return errors;
  }

  for (const issue of result.error.issues) {
    const [field, nestedField] = issue.path;

    if (field === "title") {
      errors.title = "Title is required.";
    } else if (field === "durationMinutes") {
      errors.durationMinutes = "Duration must be a positive number.";
    } else if (field === "location" && nestedField === "name") {
      errors.locationName = "Location name is required.";
    } else if (field === "location" && nestedField === "mapUrl") {
      errors.mapUrl = "Map URL must be a valid URL.";
    } else if (field === "timing") {
      errors.startTime = "Add a start time or choose a time of day.";
    } else if (field === "notes") {
      errors.notes = "Notes are required.";
    }
  }

  if (!valuesHaveTiming(activity)) {
    errors.startTime = "Add a start time or choose a time of day.";
  }

  return errors;
}

function valuesHaveTiming(activity: Activity) {
  return Boolean(activity.timing.startTime ?? activity.timing.timeOfDay);
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) {
    return null;
  }

  return <p className="field-error">{message}</p>;
}

export function createDefaultActivity(day: TripDay): Activity {
  return {
    title: "New activity",
    category: "sightseeing",
    timing: {
      timeOfDay: "afternoon"
    },
    durationMinutes: 60,
    location: {
      name: day.city,
      city: day.city
    },
    costLevel: "medium",
    notes: "Add practical notes for this stop."
  };
}

export function ActivityEditorDialog({
  activity,
  day,
  mode,
  onClose,
  onSubmit
}: ActivityEditorDialogProps) {
  const [values, setValues] = useState<ActivityEditorFormValues>(
    toFormValues(activity)
  );
  const [errors, setErrors] = useState<ActivityEditorErrors>({});
  const dialogTitle =
    mode === "add" ? `Add activity to ${day.city}` : `Edit ${activity.title}`;

  function updateField<Field extends keyof ActivityEditorFormValues>(
    field: Field,
    value: ActivityEditorFormValues[Field]
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value
    }));

    if (errors[field]) {
      setErrors((currentErrors) => {
        const nextErrors = { ...currentErrors };
        delete nextErrors[field];
        return nextErrors;
      });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const activityDraft = buildActivity(activity, values);
    const validation = activitySchema.safeParse(activityDraft);

    if (!validation.success) {
      setErrors(getValidationErrors(activityDraft as Activity));
      return;
    }

    onSubmit(validation.data);
  }

  return (
    <section
      aria-labelledby="activity-editor-title"
      aria-modal="true"
      className="activity-editor-backdrop"
      role="dialog"
    >
      <form className="activity-editor-dialog" onSubmit={handleSubmit}>
        <header>
          <p className="section-kicker">Local edit</p>
          <h2 id="activity-editor-title">{dialogTitle}</h2>
        </header>

        <div className="activity-editor-grid">
          <div className="form-field">
            <label htmlFor="activity-title">Title</label>
            <input
              aria-invalid={Boolean(errors.title)}
              id="activity-title"
              onChange={(event) =>
                updateField("title", event.currentTarget.value)
              }
              required
              type="text"
              value={values.title}
            />
            <FieldError message={errors.title} />
          </div>

          <div className="form-field">
            <label htmlFor="activity-category">Category</label>
            <select
              id="activity-category"
              onChange={(event) =>
                updateField(
                  "category",
                  event.currentTarget.value as ActivityCategory
                )
              }
              value={values.category}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="activity-start-time">Start time</label>
            <input
              aria-invalid={Boolean(errors.startTime)}
              id="activity-start-time"
              onChange={(event) =>
                updateField("startTime", event.currentTarget.value)
              }
              type="time"
              value={values.startTime}
            />
            <FieldError message={errors.startTime} />
          </div>

          <div className="form-field">
            <label htmlFor="activity-end-time">End time</label>
            <input
              id="activity-end-time"
              onChange={(event) =>
                updateField("endTime", event.currentTarget.value)
              }
              type="time"
              value={values.endTime}
            />
          </div>

          <div className="form-field">
            <label htmlFor="activity-time-of-day">Time of day</label>
            <select
              id="activity-time-of-day"
              onChange={(event) =>
                updateField(
                  "timeOfDay",
                  event.currentTarget
                    .value as ActivityEditorFormValues["timeOfDay"]
                )
              }
              value={values.timeOfDay}
            >
              {timeOfDayOptions.map((option) => (
                <option key={option.value || "flexible"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="activity-duration">Duration minutes</label>
            <input
              aria-invalid={Boolean(errors.durationMinutes)}
              id="activity-duration"
              min="1"
              onChange={(event) =>
                updateField("durationMinutes", event.currentTarget.value)
              }
              required
              type="number"
              value={values.durationMinutes}
            />
            <FieldError message={errors.durationMinutes} />
          </div>

          <div className="form-field">
            <label htmlFor="activity-location-name">Location name</label>
            <input
              aria-invalid={Boolean(errors.locationName)}
              id="activity-location-name"
              onChange={(event) =>
                updateField("locationName", event.currentTarget.value)
              }
              required
              type="text"
              value={values.locationName}
            />
            <FieldError message={errors.locationName} />
          </div>

          <div className="form-field">
            <label htmlFor="activity-location-city">Location city</label>
            <input
              id="activity-location-city"
              onChange={(event) =>
                updateField("locationCity", event.currentTarget.value)
              }
              type="text"
              value={values.locationCity}
            />
          </div>

          <div className="form-field form-field-wide">
            <label htmlFor="activity-location-address">Location address</label>
            <input
              id="activity-location-address"
              onChange={(event) =>
                updateField("locationAddress", event.currentTarget.value)
              }
              type="text"
              value={values.locationAddress}
            />
          </div>

          <div className="form-field">
            <label htmlFor="activity-map-url">Map URL</label>
            <input
              aria-invalid={Boolean(errors.mapUrl)}
              id="activity-map-url"
              onChange={(event) =>
                updateField("mapUrl", event.currentTarget.value)
              }
              type="url"
              value={values.mapUrl}
            />
            <FieldError message={errors.mapUrl} />
          </div>

          <div className="form-field">
            <label htmlFor="activity-cost-level">Cost level</label>
            <select
              id="activity-cost-level"
              onChange={(event) =>
                updateField(
                  "costLevel",
                  event.currentTarget.value as ActivityCostLevel
                )
              }
              value={values.costLevel}
            >
              {costLevelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field form-field-wide">
            <label htmlFor="activity-notes">Notes</label>
            <textarea
              aria-invalid={Boolean(errors.notes)}
              id="activity-notes"
              onChange={(event) =>
                updateField("notes", event.currentTarget.value)
              }
              rows={3}
              value={values.notes}
            />
            <FieldError message={errors.notes} />
          </div>
        </div>

        <div className="activity-editor-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="activity-editor-save" type="submit">
            Save activity
          </button>
        </div>
      </form>
    </section>
  );
}
