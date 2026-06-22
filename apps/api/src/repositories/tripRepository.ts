import { prisma } from "../db/client.js";
import type { PrismaClient } from "../generated/prisma/client.js";

export type TravelPace = "relaxed" | "balanced" | "packed";
export type TravelBudget = "budget" | "moderate" | "luxury";
export type ActivityCategory =
  | "sightseeing"
  | "food"
  | "culture"
  | "nature"
  | "shopping"
  | "transit"
  | "lodging"
  | "other";
export type ActivityCostLevel = "free" | "low" | "medium" | "high";

export type ActivityInput = {
  id?: string;
  title: string;
  category: ActivityCategory;
  timing: {
    startTime?: string;
    endTime?: string;
    timeOfDay?: "morning" | "afternoon" | "evening" | "night";
  };
  durationMinutes: number;
  location: {
    name: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    mapUrl?: string;
  };
  costLevel: ActivityCostLevel;
  notes: string;
};

export type TripDayInput = {
  date: string;
  city: string;
  summary?: string;
  weatherSummary?: string;
  activities: ActivityInput[];
};

export type CreateTripInput = {
  title: string;
  startDate: string;
  endDate: string;
  cities: string[];
  interests: string[];
  pace: TravelPace;
  budget: TravelBudget;
  constraints: string[];
  days: TripDayInput[];
};

export type UpdateTripInput = Partial<
  Omit<CreateTripInput, "constraints" | "days">
> & {
  constraints?: string[];
  days?: TripDayInput[];
};

export type ActivityResponse = ActivityInput & {
  id: string;
};

export type TripDayResponse = {
  id: string;
  date: string;
  city: string;
  summary?: string;
  weatherSummary?: string;
  activities: ActivityResponse[];
};

export type TripResponse = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  cities: string[];
  interests: string[];
  pace: TravelPace;
  budget: TravelBudget;
  constraints: string[];
  days: TripDayResponse[];
  createdAt: string;
  updatedAt: string;
};

export type TripOwner = {
  id: string;
};

export type TripRepository = {
  findOrCreateOwner(anonymousSessionId: string): Promise<TripOwner>;
  listTrips(ownerId: string): Promise<TripResponse[]>;
  createTrip(ownerId: string, input: CreateTripInput): Promise<TripResponse>;
  findTrip(ownerId: string, tripId: string): Promise<TripResponse | null>;
  updateTrip(
    ownerId: string,
    tripId: string,
    input: UpdateTripInput
  ): Promise<TripResponse | null>;
  deleteTrip(ownerId: string, tripId: string): Promise<boolean>;
};

type PrismaTripWithDays = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  cities: string[];
  interests: string[];
  pace: TravelPace;
  budget: TravelBudget;
  constraints: string[];
  createdAt: Date;
  updatedAt: Date;
  days: Array<{
    id: string;
    date: Date;
    city: string;
    summary: string | null;
    weatherSummary: string | null;
    activities: Array<{
      id: string;
      title: string;
      category: ActivityCategory;
      startTime: string | null;
      endTime: string | null;
      timeOfDay: string | null;
      durationMinutes: number;
      locationName: string;
      locationAddress: string | null;
      locationCity: string | null;
      latitude: number | null;
      longitude: number | null;
      mapUrl: string | null;
      costLevel: ActivityCostLevel;
      notes: string;
    }>;
  }>;
};

const tripWithDaysInclude = {
  days: {
    orderBy: {
      orderIndex: "asc" as const
    },
    include: {
      activities: {
        orderBy: {
          orderIndex: "asc" as const
        }
      }
    }
  }
};

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toIsoDateTime(value: Date) {
  return value.toISOString();
}

function buildActivityCreateData(activity: ActivityInput, orderIndex: number) {
  return {
    ...(activity.id !== undefined ? { id: activity.id } : {}),
    title: activity.title,
    category: activity.category,
    ...(activity.timing.startTime !== undefined
      ? { startTime: activity.timing.startTime }
      : {}),
    ...(activity.timing.endTime !== undefined
      ? { endTime: activity.timing.endTime }
      : {}),
    ...(activity.timing.timeOfDay !== undefined
      ? { timeOfDay: activity.timing.timeOfDay }
      : {}),
    durationMinutes: activity.durationMinutes,
    locationName: activity.location.name,
    ...(activity.location.address !== undefined
      ? { locationAddress: activity.location.address }
      : {}),
    ...(activity.location.city !== undefined
      ? { locationCity: activity.location.city }
      : {}),
    ...(activity.location.latitude !== undefined
      ? { latitude: activity.location.latitude }
      : {}),
    ...(activity.location.longitude !== undefined
      ? { longitude: activity.location.longitude }
      : {}),
    ...(activity.location.mapUrl !== undefined
      ? { mapUrl: activity.location.mapUrl }
      : {}),
    costLevel: activity.costLevel,
    notes: activity.notes,
    orderIndex
  };
}

function buildDayCreateData(day: TripDayInput, orderIndex: number) {
  return {
    date: toDate(day.date),
    city: day.city,
    ...(day.summary !== undefined ? { summary: day.summary } : {}),
    ...(day.weatherSummary !== undefined
      ? { weatherSummary: day.weatherSummary }
      : {}),
    orderIndex,
    activities: {
      create: day.activities.map((activity, activityIndex) =>
        buildActivityCreateData(activity, activityIndex)
      )
    }
  };
}

function buildTripUpdateData(input: UpdateTripInput) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.startDate !== undefined
      ? { startDate: toDate(input.startDate) }
      : {}),
    ...(input.endDate !== undefined ? { endDate: toDate(input.endDate) } : {}),
    ...(input.cities !== undefined ? { cities: input.cities } : {}),
    ...(input.interests !== undefined ? { interests: input.interests } : {}),
    ...(input.pace !== undefined ? { pace: input.pace } : {}),
    ...(input.budget !== undefined ? { budget: input.budget } : {}),
    ...(input.constraints !== undefined
      ? { constraints: input.constraints }
      : {}),
    ...(input.days !== undefined
      ? {
          days: {
            create: input.days.map((day, dayIndex) =>
              buildDayCreateData(day, dayIndex)
            )
          }
        }
      : {})
  };
}

function mapTrip(trip: PrismaTripWithDays): TripResponse {
  return {
    id: trip.id,
    title: trip.title,
    startDate: toIsoDate(trip.startDate),
    endDate: toIsoDate(trip.endDate),
    cities: trip.cities,
    interests: trip.interests,
    pace: trip.pace,
    budget: trip.budget,
    constraints: trip.constraints,
    createdAt: toIsoDateTime(trip.createdAt),
    updatedAt: toIsoDateTime(trip.updatedAt),
    days: trip.days.map((day) => ({
      id: day.id,
      date: toIsoDate(day.date),
      city: day.city,
      ...(day.summary !== null ? { summary: day.summary } : {}),
      ...(day.weatherSummary !== null
        ? { weatherSummary: day.weatherSummary }
        : {}),
      activities: day.activities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        category: activity.category,
        timing: {
          ...(activity.startTime !== null
            ? { startTime: activity.startTime }
            : {}),
          ...(activity.endTime !== null ? { endTime: activity.endTime } : {}),
          ...(activity.timeOfDay !== null
            ? {
                timeOfDay: activity.timeOfDay as
                  | "morning"
                  | "afternoon"
                  | "evening"
                  | "night"
              }
            : {})
        },
        durationMinutes: activity.durationMinutes,
        location: {
          name: activity.locationName,
          ...(activity.locationAddress !== null
            ? { address: activity.locationAddress }
            : {}),
          ...(activity.locationCity !== null
            ? { city: activity.locationCity }
            : {}),
          ...(activity.latitude !== null
            ? { latitude: activity.latitude }
            : {}),
          ...(activity.longitude !== null
            ? { longitude: activity.longitude }
            : {}),
          ...(activity.mapUrl !== null ? { mapUrl: activity.mapUrl } : {})
        },
        costLevel: activity.costLevel,
        notes: activity.notes
      }))
    }))
  };
}

export function createPrismaTripRepository(
  client: PrismaClient = prisma
): TripRepository {
  return {
    async findOrCreateOwner(anonymousSessionId) {
      const user = await client.user.upsert({
        where: {
          anonymousSessionId
        },
        update: {},
        create: {
          anonymousSessionId,
          displayName: "Local Anonymous Traveler"
        },
        select: {
          id: true
        }
      });

      return user;
    },

    async listTrips(ownerId) {
      const trips = await client.trip.findMany({
        where: {
          userId: ownerId
        },
        orderBy: {
          startDate: "asc"
        },
        include: tripWithDaysInclude
      });

      return trips.map((trip) => mapTrip(trip as PrismaTripWithDays));
    },

    async createTrip(ownerId, input) {
      const trip = await client.trip.create({
        data: {
          userId: ownerId,
          title: input.title,
          cities: input.cities,
          startDate: toDate(input.startDate),
          endDate: toDate(input.endDate),
          pace: input.pace,
          budget: input.budget,
          interests: input.interests,
          constraints: input.constraints,
          days: {
            create: input.days.map((day, dayIndex) =>
              buildDayCreateData(day, dayIndex)
            )
          }
        },
        include: tripWithDaysInclude
      });

      return mapTrip(trip as PrismaTripWithDays);
    },

    async findTrip(ownerId, tripId) {
      const trip = await client.trip.findFirst({
        where: {
          id: tripId,
          userId: ownerId
        },
        include: tripWithDaysInclude
      });

      return trip === null ? null : mapTrip(trip as PrismaTripWithDays);
    },

    async updateTrip(ownerId, tripId, input) {
      const existingTrip = await client.trip.findFirst({
        where: {
          id: tripId,
          userId: ownerId
        },
        select: {
          id: true
        }
      });

      if (existingTrip === null) {
        return null;
      }

      const trip = await client.$transaction(async (transaction) => {
        if (input.days !== undefined) {
          await transaction.tripDay.deleteMany({
            where: {
              tripId
            }
          });
        }

        return transaction.trip.update({
          where: {
            id: tripId
          },
          data: buildTripUpdateData(input),
          include: tripWithDaysInclude
        });
      });

      return mapTrip(trip as PrismaTripWithDays);
    },

    async deleteTrip(ownerId, tripId) {
      const existingTrip = await client.trip.findFirst({
        where: {
          id: tripId,
          userId: ownerId
        },
        select: {
          id: true
        }
      });

      if (existingTrip === null) {
        return false;
      }

      await client.trip.delete({
        where: {
          id: tripId
        }
      });

      return true;
    }
  };
}
