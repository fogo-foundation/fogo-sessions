import { render, screen } from "@testing-library/react";

import { Widget } from "./index.js";
import "@testing-library/jest-dom";

describe("Widget", () => {
  it("creates the widget", async () => {
    render(<Widget />);
    const elem = await screen.findByText("Hello, World!");
    expect(elem).toBeInTheDocument();
  });
});
