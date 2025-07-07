import { render, screen } from "@testing-library/react";

import "@testing-library/jest-dom";

describe("Widget", () => {
  it("creates the widget", async () => {
    render(<div>Hello, World!</div>);
    const elem = await screen.findByText("Hello, World!");
    expect(elem).toBeInTheDocument();
  });
});
