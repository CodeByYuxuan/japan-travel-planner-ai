import { type FormEvent, useState } from "react";

import type { TripRequest } from "../../../../../packages/shared/src/schemas/tripRequest.js";
import {
  tripIntakeInitialValues,
  validateTripIntake,
  type TripIntakeErrors,
  type TripIntakeField,
  type TripIntakeFormValues
} from "./formState.js";

export type TripIntakeFormProps = {
  initialValues?: TripIntakeFormValues;
  isSubmitting?: boolean;
  mockSubmitLabel?: string;
  onMockSubmit?: (request: TripRequest) => void;
  onSubmitTrip: (request: TripRequest) => void;
  submitLabel?: string;
};

const fieldIds = {
  startDate: "trip-start-date",
  endDate: "trip-end-date",
  cities: "trip-cities",
  interests: "trip-interests",
  pace: "trip-pace",
  budget: "trip-budget",
  constraints: "trip-constraints"
} satisfies Record<TripIntakeField, string>;

function FieldError({
  errors,
  field
}: {
  errors: TripIntakeErrors;
  field: TripIntakeField;
}) {
  const message = errors[field];

  if (!message) {
    return null;
  }

  return (
    <p className="field-error" id={`${fieldIds[field]}-error`}>
      {message}
    </p>
  );
}

export function TripIntakeForm({
  initialValues = tripIntakeInitialValues,
  isSubmitting = false,
  mockSubmitLabel,
  onMockSubmit,
  onSubmitTrip,
  submitLabel = "Create saved itinerary"
}: TripIntakeFormProps) {
  const [values, setValues] = useState<TripIntakeFormValues>(initialValues);
  const [errors, setErrors] = useState<TripIntakeErrors>({});

  function updateField<Field extends TripIntakeField>(
    field: Field,
    value: TripIntakeFormValues[Field]
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

  function submitValidated(onSubmit: (request: TripRequest) => void) {
    const validation = validateTripIntake(values);
    setErrors(validation.errors);

    if (validation.success) {
      onSubmit(validation.request);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitValidated(onSubmitTrip);
  }

  return (
    <form
      aria-labelledby="trip-intake-title"
      className="trip-intake-form"
      noValidate
      onSubmit={handleSubmit}
    >
      <header className="trip-intake-header">
        <p className="section-kicker">Trip setup</p>
        <h2 id="trip-intake-title">Plan your Japan route</h2>
        <p>
          Set the travel frame, then create or preview the structured itinerary
          for this MVP.
        </p>
      </header>

      <div className="trip-intake-grid">
        <div className="form-field">
          <label htmlFor={fieldIds.startDate}>Start date</label>
          <input
            aria-describedby={
              errors.startDate ? `${fieldIds.startDate}-error` : undefined
            }
            aria-invalid={Boolean(errors.startDate)}
            id={fieldIds.startDate}
            name="startDate"
            onChange={(event) =>
              updateField("startDate", event.currentTarget.value)
            }
            required
            type="date"
            value={values.startDate}
          />
          <FieldError errors={errors} field="startDate" />
        </div>

        <div className="form-field">
          <label htmlFor={fieldIds.endDate}>End date</label>
          <input
            aria-describedby={
              errors.endDate ? `${fieldIds.endDate}-error` : undefined
            }
            aria-invalid={Boolean(errors.endDate)}
            id={fieldIds.endDate}
            name="endDate"
            onChange={(event) =>
              updateField("endDate", event.currentTarget.value)
            }
            required
            type="date"
            value={values.endDate}
          />
          <FieldError errors={errors} field="endDate" />
        </div>

        <div className="form-field">
          <label htmlFor={fieldIds.cities}>Cities</label>
          <input
            aria-describedby={
              errors.cities ? `${fieldIds.cities}-error` : undefined
            }
            aria-invalid={Boolean(errors.cities)}
            id={fieldIds.cities}
            name="cities"
            onChange={(event) =>
              updateField("cities", event.currentTarget.value)
            }
            required
            type="text"
            value={values.cities}
          />
          <FieldError errors={errors} field="cities" />
        </div>

        <div className="form-field">
          <label htmlFor={fieldIds.interests}>Interests</label>
          <input
            aria-describedby={
              errors.interests ? `${fieldIds.interests}-error` : undefined
            }
            aria-invalid={Boolean(errors.interests)}
            id={fieldIds.interests}
            name="interests"
            onChange={(event) =>
              updateField("interests", event.currentTarget.value)
            }
            required
            type="text"
            value={values.interests}
          />
          <FieldError errors={errors} field="interests" />
        </div>

        <div className="form-field">
          <label htmlFor={fieldIds.pace}>Travel pace</label>
          <select
            aria-describedby={
              errors.pace ? `${fieldIds.pace}-error` : undefined
            }
            aria-invalid={Boolean(errors.pace)}
            id={fieldIds.pace}
            name="pace"
            onChange={(event) =>
              updateField(
                "pace",
                event.currentTarget.value as TripIntakeFormValues["pace"]
              )
            }
            required
            value={values.pace}
          >
            <option value="">Select pace</option>
            <option value="relaxed">Relaxed</option>
            <option value="balanced">Balanced</option>
            <option value="packed">Packed</option>
          </select>
          <FieldError errors={errors} field="pace" />
        </div>

        <div className="form-field">
          <label htmlFor={fieldIds.budget}>Budget</label>
          <select
            aria-describedby={
              errors.budget ? `${fieldIds.budget}-error` : undefined
            }
            aria-invalid={Boolean(errors.budget)}
            id={fieldIds.budget}
            name="budget"
            onChange={(event) =>
              updateField(
                "budget",
                event.currentTarget.value as TripIntakeFormValues["budget"]
              )
            }
            required
            value={values.budget}
          >
            <option value="">Select budget</option>
            <option value="budget">Budget</option>
            <option value="moderate">Moderate</option>
            <option value="luxury">Luxury</option>
          </select>
          <FieldError errors={errors} field="budget" />
        </div>

        <div className="form-field form-field-wide">
          <label htmlFor={fieldIds.constraints}>Constraints</label>
          <textarea
            id={fieldIds.constraints}
            name="constraints"
            onChange={(event) =>
              updateField("constraints", event.currentTarget.value)
            }
            rows={3}
            value={values.constraints}
          />
        </div>
      </div>

      <div className="trip-intake-actions">
        <button
          className="trip-intake-submit"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Preparing itinerary" : submitLabel}
        </button>
        {onMockSubmit && mockSubmitLabel ? (
          <button
            className="trip-intake-secondary"
            disabled={isSubmitting}
            onClick={() => submitValidated(onMockSubmit)}
            type="button"
          >
            {mockSubmitLabel}
          </button>
        ) : null}
      </div>
    </form>
  );
}
