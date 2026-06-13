import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { App } from "./App";

describe("App", () => {
  test("renders the responsive web MVP shell", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Japan Travel Planner");
    expect(html).toContain("Japan trip workspace");
    expect(html).toContain("No trip selected");
    expect(html).toContain("React + Vite");
    expect(html).toContain("localhost:5173");
  });
});
