import { helloWorld } from "./index.js";

describe("helloWorld", () => {
  it("says hello", () => {
    expect(helloWorld()).toBe("Hello, World!");
  });
});
