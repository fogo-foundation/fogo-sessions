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

const {
  createStyles: _createStyles,
  imports: _imports,
  keyframes: _keyframes,
  rawStyles: _rawStyles,
} = makeCssFuncs({ variables: Theme });

export const createStyles: typeof _createStyles = (
  ruleId,
  rulesFnc,
  overrides,
) =>
  // @ts-expect-error - typescript confusion that the return type could be a mismatch
  // despite us declaring the explicit type of the function.
  // doesn't affect usage or runtime, solely a local (this file only)
  // typescript issue
  _createStyles(ruleId, rulesFnc, {
    ...overrides,
    registry: Singleton.registry,
  });

export const imports: typeof _imports = (ruleId, rulesFnc, overrides) =>
  _imports(ruleId, rulesFnc, { ...overrides, registry: Singleton.registry });

export const keyframes: typeof _keyframes = (ruleId, rulesFnc, overrides) =>
  _keyframes(ruleId, rulesFnc, {
    ...overrides,
    registry: Singleton.registry,
  });

export const rawStyles: typeof _rawStyles = (ruleId, rulesFnc, overrides) =>
  _rawStyles(ruleId, rulesFnc, {
    ...overrides,
    registry: Singleton.registry,
  });
