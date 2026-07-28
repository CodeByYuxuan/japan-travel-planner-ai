import { fireEvent, render } from "@testing-library/react-native";

import { mockTrips } from "../mocks/mockTrips";
import { TripDetailScreen } from "./TripDetailScreen";

describe("TripDetailScreen", () => {
  it("renders itinerary days and activities", async () => {
    const onBack = jest.fn();
    const trip = mockTrips[0];
    const screen = await render(
      <TripDetailScreen trip={trip} onBack={onBack} />
    );

    expect(screen.getByText("Day 1: Tokyo")).toBeTruthy();
    expect(screen.getByText("Day 2: Kyoto")).toBeTruthy();
    expect(screen.getByText("Morning walk through Ueno Park")).toBeTruthy();
    expect(screen.getByText("Kiyomizu-dera temple visit")).toBeTruthy();

    await fireEvent.press(
      screen.getByRole("button", { name: "Back to saved trips" })
    );

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
