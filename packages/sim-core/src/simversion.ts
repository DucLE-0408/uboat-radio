/**
 * Version of the simulation's observable behaviour. A save is seed + options + command log and is rebuilt by replay, so any change that
 * alters the event log of an existing save (rules, balance numbers, RNG streams, event shapes) makes old saves replay into a different
 * game. Bump this integer in the same change; `test/simversion.test.ts` fails when behaviour changes without a bump.
 * Not the product version (root `VERSION`).
 */
export const SIM_VERSION = 3;
