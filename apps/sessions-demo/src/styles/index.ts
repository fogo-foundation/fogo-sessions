import { setCssRegistrySingleton, Theme } from "@fogo/sessions-sdk-react";
import { makeCssFuncs, SimpleStyleRegistry, setSeed } from "simplestyle-js";

setSeed(123_122);

export const StyleRegistry = new SimpleStyleRegistry();

setCssRegistrySingleton(StyleRegistry);

export const { createStyles, imports, keyframes, rawStyles } = makeCssFuncs({
  registry: StyleRegistry,
  variables: Theme,
});
