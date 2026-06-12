import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { App } from "./App";

describe("App", () => {
  test("renders the project shell", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Japan Travel Planner AI");
    expect(html).toContain("web MVP shell");
  });
});
