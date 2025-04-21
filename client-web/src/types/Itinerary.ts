export interface ItineraryDay {
  time?: string;
  activity: string;
  description?: string;
}

export interface ItineraryResponse {
  [day: string]: ItineraryDay[];
}