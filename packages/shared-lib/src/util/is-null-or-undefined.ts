/**
 * returns true if a something is either null or undefined,
 * false if otherwise.
 * will also properly type narrow
 */
export function isNullOrUndefined(thing: unknown): thing is null | undefined {
  return thing === undefined || thing === null;
}
