import type { PropsWithChildren } from "react";

jest.mock("react-native-safe-area-context", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    SafeAreaProvider: ({ children }: PropsWithChildren) =>
      React.createElement(View, null, children),
    SafeAreaView: View
  };
});
