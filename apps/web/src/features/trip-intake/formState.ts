import type { Itinerary } from "../../../../../packages/shared/src/schemas/itinerary.js";
import {
  tripRequestSchema,
  type TravelBudget,
  type TravelPace,
  type TripRequest
} from "../../../../../packages/shared/src/schemas/tripRequest.js";
import { mockItinerary, mockTripRequest } from "../../mocks/index.js";

export type TripIntakeFormValues = {
  startDate: string;
  endDate: string;
  cities: string;
  interests: string;
  pace: TravelPace | "";
  budget: TravelBudget | "";
  constraints: string;
};

export type TripIntakeField = keyof TripIntakeFormValues;

export type TripIntakeErrors = Partial<Record<TripIntakeField, string>>;

export type TripIntakeValidationResult =
  | {
      success: true;
      request: TripRequest;
      errors: TripIntakeErrors;
    }
  | {
      success: false;
      errors: TripIntakeErrors;
    };

export type TripIntakeSubmitResult =
  | {
      status: "success";
      request: TripRequest;
      itinerary: Itinerary;
    }
  | {
      status: "error";
      errors: TripIntakeErrors;
    };

export const emptyTripIntakeValues = {
  startDate: "",
  endDate: "",
  cities: "",
  interests: "",
  pace: "",
  budget: "",
  constraints: ""
} satisfies TripIntakeFormValues;

export const tripIntakeInitialValues = {
  startDate: mockTripRequest.startDate,
  endDate: mockTripRequest.endDate,
  cities: mockTripRequest.cities.join(", "),
  interests: mockTripRequest.interests.join(", "),
  pace: mockTripRequest.pace,
  budget: mockTripRequest.budget,
  constraints: mockTripRequest.constraints.join("\n")
} satisfies TripIntakeFormValues;

const fieldLabels = {
  startDate: "Start date",
  endDate: "End date",
  cities: "Cities",
  interests: "Interests",
  pace: "Travel pace",
  budget: "Budget",
  constraints: "Constraints"
} satisfies Record<TripIntakeField, string>;

function parseList(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toTripRequestInput(values: TripIntakeFormValues) {
  return {
    startDate: values.startDate.trim(),
    endDate: values.endDate.trim(),
    cities: parseList(values.cities),
    interests: parseList(values.interests),
    pace: values.pace,
    budget: values.budget,
    constraints: parseList(values.constraints)
  };
}

function getIssueMessage(field: TripIntakeField, message: string) {
  if (message === "endDate must be on or after startDate.") {
    return "End date must be on or after the start date.";
  }

  if (field === "startDate" || field === "endDate") {
    return `${fieldLabels[field]} must use YYYY-MM-DD.`;
  }

  if (field === "cities") {
    return "Add at least one city.";
  }

  if (field === "interests") {
    return "Add at least one interest.";
  }

  if (field === "pace") {
    return "Choose a travel pace.";
  }

  if (field === "budget") {
    return "Choose a budget.";
  }

  return message;
}

function isTripIntakeField(value: PropertyKey): value is TripIntakeField {
  return value in fieldLabels;
}

function getRequiredErrors(values: TripIntakeFormValues) {
  const errors: TripIntakeErrors = {};

  if (!values.startDate.trim()) {
    errors.startDate = "Start date is required.";
  }

  if (!values.endDate.trim()) {
    errors.endDate = "End date is required.";
  }

  if (parseList(values.cities).length === 0) {
    errors.cities = "Add at least one city.";
  }

  if (parseList(values.interests).length === 0) {
    errors.interests = "Add at least one interest.";
  }

  if (!values.pace) {
    errors.pace = "Choose a travel pace.";
  }

  if (!values.budget) {
    errors.budget = "Choose a budget.";
  }

  return errors;
}

export function validateTripIntake(
  values: TripIntakeFormValues
): TripIntakeValidationResult {
  const errors = getRequiredErrors(values);
  const parsed = tripRequestSchema.safeParse(toTripRequestInput(values));

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const [field] = issue.path;

      if (field !== undefined && isTripIntakeField(field) && !errors[field]) {
        errors[field] = getIssueMessage(field, issue.message);
      }
    }
  }

  if (Object.keys(errors).length > 0 || !parsed.success) {
    return {
      success: false,
      errors
    };
  }

  return {
    success: true,
    request: parsed.data,
    errors: {}
  };
}

export function submitTripIntake(
  values: TripIntakeFormValues
): TripIntakeSubmitResult {
  const validation = validateTripIntake(values);

  if (!validation.success) {
    return {
      status: "error",
      errors: validation.errors
    };
  }

  return {
    status: "success",
    request: validation.request,
    itinerary: mockItinerary
  };
}
