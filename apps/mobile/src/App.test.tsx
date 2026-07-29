import { fireEvent, render } from "@testing-library/react-native";

import type { MobileApiClient } from "./api/mobileApiClient";
import App, { AppView } from "./App";
import { mockTrips } from "./mocks/mockTrips";

describe("App", () => {
  it("opens a saved trip and returns to the list", async () => {
    const screen = await render(<App />);

    await fireEvent.press(
      await screen.findByRole("button", {
        name: "Open Tokyo And Kyoto Spring Highlights"
      })
    );

    expect(
      screen.getByRole("header", {
        name: "Tokyo And Kyoto Spring Highlights"
      })
    ).toBeTruthy();
    expect(screen.getByText("Day 1: Tokyo")).toBeTruthy();

    await fireEvent.press(
      screen.getByRole("button", { name: "Back to saved trips" })
    );

    expect(screen.getByRole("header", { name: "Saved trips" })).toBeTruthy();
  });

  it("renders the offline state returned by the mobile client", async () => {
    const client: MobileApiClient = {
      cacheOpenedTrip: jest.fn(async () => undefined),
      listTrips: async () => ({
        source: "cache",
        trips: [mockTrips[0]]
      })
    };
    const screen = await render(<AppView client={client} />);

    expect(await screen.findByText("OFFLINE COPY")).toBeTruthy();
    expect(screen.getByText(/recently opened trips/)).toBeTruthy();
  });
});
