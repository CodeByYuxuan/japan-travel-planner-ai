import { ApiError } from "../errors/ApiError.js";
import {
  createPrismaTripRepository,
  type CreateTripInput,
  type TripRepository,
  type UpdateTripInput
} from "../repositories/tripRepository.js";

export const localAnonymousSessionId = "local-anonymous-traveler";

export class TripService {
  constructor(
    private readonly repository: TripRepository,
    private readonly anonymousSessionId = localAnonymousSessionId
  ) {}

  private async getOwnerId() {
    const owner = await this.repository.findOrCreateOwner(
      this.anonymousSessionId
    );

    return owner.id;
  }

  async listTrips() {
    return this.repository.listTrips(await this.getOwnerId());
  }

  async createTrip(input: CreateTripInput) {
    return this.repository.createTrip(await this.getOwnerId(), input);
  }

  async getTrip(tripId: string) {
    const trip = await this.repository.findTrip(
      await this.getOwnerId(),
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

  async updateTrip(tripId: string, input: UpdateTripInput) {
    const trip = await this.repository.updateTrip(
      await this.getOwnerId(),
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

  async deleteTrip(tripId: string) {
    const deleted = await this.repository.deleteTrip(
      await this.getOwnerId(),
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
