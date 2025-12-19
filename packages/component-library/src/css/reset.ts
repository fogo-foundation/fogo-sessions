import type { SimpleStyleRules } from "simplestyle-js";

import { imports } from "./bind.js";
import type { Theme } from "./theme.js";

imports("reset-imports", () => [
  '@import url("https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300..800&display=swap");',
]);

export function resetAllLocalRules(theme: Theme): SimpleStyleRules {
  return {
    [`&,
&::before,
&::after,
& * & *::before,
& *::after`]: {
      all: "revert",
    },
    "&": {
      fontFamily: '"Funnel Display", sans-serif',
      fontOpticalSizing: "auto",
      fontStyle: "normal",
      colorScheme: "dark",
      color: "purple",
      textAlign: "left",

      "&*::selection": {
        color: theme.colorPalette.black,
        background: theme.color.accent,
      },
    },
  };
}
