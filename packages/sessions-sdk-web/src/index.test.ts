import { createWidget } from "./index.js";

describe("createWidget", () => {
  it("creates the widget", () => {
    const widget = createWidget();
    expect(widget.outerHTML).toBe("<div>Hello, World!</div>");
  });
});
