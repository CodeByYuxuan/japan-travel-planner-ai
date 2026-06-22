import { ApiError } from "../errors/ApiError.js";
import {
  createPrismaTripRepository,
  type CreateTripInput,
  type TripRepository,
  type UpdateTripInput
} from "../repositories/tripRepository.js";

export class TripService {
  constructor(private readonly repository: TripRepository) {}

  private async getOwnerId(anonymousSessionId: string) {
    const owner = await this.repository.findOrCreateOwner(anonymousSessionId);

    return owner.id;
  }

  async listTrips(anonymousSessionId: string) {
    return this.repository.listTrips(await this.getOwnerId(anonymousSessionId));
  }

  async createTrip(anonymousSessionId: string, input: CreateTripInput) {
    return this.repository.createTrip(
      await this.getOwnerId(anonymousSessionId),
      input
    );
  }

  async getTrip(anonymousSessionId: string, tripId: string) {
    const trip = await this.repository.findTrip(
      await this.getOwnerId(anonymousSessionId),
      tripId
    );

    if (trip === null) {
      throw new ApiError({
        statusCode: 404,
        code: "TRIP_NOT_FOUND",
        message: "Trip was not found."
      });
    }

    return trip;
  }

  async updateTrip(
    anonymousSessionId: string,
    tripId: string,
    input: UpdateTripInput
  ) {
    const trip = await this.repository.updateTrip(
      await this.getOwnerId(anonymousSessionId),
      tripId,
      input
    );

    if (trip === null) {
      throw new ApiError({
        statusCode: 404,
        code: "TRIP_NOT_FOUND",
        message: "Trip was not found."
      });
    }

    return trip;
  }

  async deleteTrip(anonymousSessionId: string, tripId: string) {
    const deleted = await this.repository.deleteTrip(
      await this.getOwnerId(anonymousSessionId),
      tripId
    );

    if (!deleted) {
      throw new ApiError({
        statusCode: 404,
        code: "TRIP_NOT_FOUND",
        message: "Trip was not found."
      });
    }
  }
}

export function createTripService(
  repository: TripRepository = createPrismaTripRepository()
) {
  return new TripService(repository);
}
