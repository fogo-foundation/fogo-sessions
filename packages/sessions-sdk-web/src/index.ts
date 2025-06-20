import { helloWorld } from "@fogo/sessions-sdk";

export const createWidget = () => {
  const widget = document.createElement("div");
  widget.textContent = helloWorld();
  return widget;
};
