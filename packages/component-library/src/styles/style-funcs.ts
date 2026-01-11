import { makeCssFuncs, type SimpleStyleRegistry } from "simplestyle-js";
import { Theme } from "./theme.js";

const Singleton: { registry: SimpleStyleRegistry | undefined } = {
  registry: undefined,
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
 * is what will happen in Storybook or other SPAs)
 */
export function setCssRegistrySingleton(registry: SimpleStyleRegistry) {
  Singleton.registry = registry;
}

/**
 * returns the current CSS registry singleton,
 * if available
 */
export function getCssRegistrySingleton() {
  return Singleton.registry;
}

// we create an object here so the pointer is maintained
// to the makeCssFuncs call. This will allow the registry pointer
// to be updated properly
const makeCssFuncsOpts = {
  registry: Singleton.registry,
  variables: Theme,
};

export const { createStyles, imports, keyframes, rawStyles } =
  makeCssFuncs(makeCssFuncsOpts);
