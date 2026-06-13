export const PROJECT_NAME = "Japan Travel Planner AI";
export const API_BASE_PATH = "/api";

export type HealthResponse = {
  status: "ok";
  service: string;
};

export {
  apiErrorSchema,
  apiFieldErrorSchema,
  type ApiError,
  type ApiFieldError
} from "./schemas/apiError.js";
export {
  activityCategorySchema,
  activityCostLevelSchema,
  activityLocationSchema,
  activitySchema,
  activityTimingSchema,
  itinerarySchema,
  tripDaySchema,
  type Activity,
  type ActivityCategory,
  type ActivityCostLevel,
  type ActivityLocation,
  type ActivityTiming,
  type Itinerary,
  type TripDay
} from "./schemas/itinerary.js";
export {
  isoDateSchema,
  travelBudgetSchema,
  travelPaceSchema,
  tripRequestSchema,
  type IsoDate,
  type TravelBudget,
  type TravelPace,
  type TripRequest
} from "./schemas/tripRequest.js";
