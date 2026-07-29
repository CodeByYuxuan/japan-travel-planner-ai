import { fireEvent, render } from "@testing-library/react-native";

import { mockTrips } from "../mocks/mockTrips";
import { TripListScreen } from "./TripListScreen";

describe("TripListScreen", () => {
  it("renders saved trips and reports the selected trip", async () => {
    const onSelectTrip = jest.fn();
    const screen = await render(
      <TripListScreen
        dataSource="preview"
        trips={mockTrips}
        onSelectTrip={onSelectTrip}
      />
    );

    expect(screen.getByText(mockTrips[0].title)).toBeTruthy();
    expect(screen.getByText(mockTrips[1].title)).toBeTruthy();

    await fireEvent.press(
      screen.getByRole("button", { name: `Open ${mockTrips[1].title}` })
    );

    expect(onSelectTrip).toHaveBeenCalledWith(mockTrips[1]);
  });

  it("renders an empty state when no trips are available", async () => {
    const screen = await render(
      <TripListScreen
        dataSource="preview"
        trips={[]}
        onSelectTrip={jest.fn()}
      />
    );

    expect(screen.getByText("No saved trips")).toBeTruthy();
  });

  it("labels cached trips as an offline read-only copy", async () => {
    const screen = await render(
      <TripListScreen
        dataSource="cache"
        trips={mockTrips}
        onSelectTrip={jest.fn()}
      />
    );

    expect(screen.getByText("OFFLINE COPY")).toBeTruthy();
    expect(screen.getByText(/read-only/)).toBeTruthy();
  });
});
