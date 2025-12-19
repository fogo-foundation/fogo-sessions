import { makeCssFuncs, setSeed } from "simplestyle-js";

import { theme } from "./theme.js";

// the day the first Matrix film was released in cinemas in the USA
// setting this allows for determinstic computation of unique css classNames
setSeed(922_838_400_000);

export const { createStyles, imports, keyframes, rawStyles } = makeCssFuncs({
  variables: theme,
});
