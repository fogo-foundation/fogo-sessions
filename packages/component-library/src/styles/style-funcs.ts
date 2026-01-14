import { makeCssFuncs, SimpleStyleRegistry, setSeed } from "simplestyle-js";
import { Theme } from "./theme.js";

// ensures the classnames are deterministically
// computed in the same manner on each run
setSeed(123_123_123);

const Singleton: { registry: SimpleStyleRegistry | undefined } = {
  registry: new SimpleStyleRegistry(),
};

/**
 * intended to be called when rendering styles
 * in a SRR context, this sets a singleton
 * instance of the simplestyle registry
 * so that any component-library CSS
 * usage references that, if it's available.
 * If it's not available, CSS-in-JS will function
 * "like the old days" and just automatically append
 * themselves to <style /> tags in the DOM (which
 * is what will happen in Storybook or other SPAs).
 *
 * If you are running a traditional SPA,
 * you should call this and set the value to "undefined"
 * before any of your components are imported.
 */
export function setCssRegistrySingleton(
  registry: SimpleStyleRegistry | undefined,
) {
  Singleton.registry = registry;
}

/**
 * returns the current CSS registry singleton,
 * if available
 */
export function getCssRegistrySingleton() {
  return Singleton.registry;
}

export const { createStyles, imports, keyframes, rawStyles } = makeCssFuncs(
  () => ({ registry: Singleton.registry, variables: Theme }),
);
