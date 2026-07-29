import { fireEvent, render } from "@testing-library/react-native";

import App from "./App";

describe("App", () => {
  it("opens a saved trip and returns to the list", async () => {
    const screen = await render(<App />);

    await fireEvent.press(
      screen.getByRole("button", {
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
});
