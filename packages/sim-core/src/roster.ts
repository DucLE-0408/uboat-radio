// Crew roster (G4): fixed roles, names drawn from an invented pool by the seed. Pure.
import type { Balance } from "./balance";
import { derive } from "./rng";

export const ROLES = ["captain", "xo", "chief", "sound", "liaison"] as const;
export type Role = (typeof ROLES)[number];
export interface CrewMember { readonly role: Role; readonly name: string }

export function makeRoster(seed: number | string, b: Balance): CrewMember[] {
  const names = derive(seed, "roster", "names").shuffle(b.roster.names);
  return ROLES.map((role, i) => ({ role, name: names[i] as string }));
}

/** The member who is hurt when the hull is badly damaged: never the captain, never the player's own liaison. */
export function absentRole(seed: number | string): Role {
  return derive(seed, "roster", "absent").pick(["xo", "chief", "sound"] as const);
}

/** Who speaks for `role` when it is absent: the next present role in rank order (wrapping). */
export function successorOf(role: Role, absent: Role | null): Role {
  if (absent !== role) return role;
  const i = ROLES.indexOf(role);
  for (let k = 1; k <= ROLES.length; k++) {
    const r = ROLES[(i + k) % ROLES.length] as Role;
    if (r !== absent) return r;
  }
  return "captain";
}
