// Art-pass palette (follows the user's reference: desaturated slate bulkheads, dusty-rose paper, green-black machine,
// moonlit blue hull, warm local lamps, green only as an accent). Ramps run dark -> light.
import { rgb, type RGBA } from "./pix.ts";

const ramp = (...h: string[]): RGBA[] => h.map((c) => rgb(c));

export const T = {
  // bulkhead / scene neutrals (cool slate with a faint plum cast)
  k: ramp("#0e0d12", "#16151b", "#1e1c24", "#27252e", "#322f39", "#3f3b47", "#514c59", "#69636f"),
  // painted mauve-red metal (portrait desk, gauge plate)
  m: ramp("#24161b", "#341f26", "#472a33", "#5d3742", "#764654", "#8f5a67"),
  // paper (dusty rose) and its ink
  pa: ramp("#7d505b", "#9e6b76", "#bb8791", "#cfa1a9", "#ddb6bb", "#e8cacc"),
  hb: ramp("#6e3b47", "#874b58", "#9d5b69"), // header strips on forms
  ink: rgb("#2a1920"), ink2: rgb("#563845"),
  // cipher machine casing (green-black enamel)
  e: ramp("#101312", "#171b1a", "#1f2423", "#2a302f", "#373e3d", "#4a5251", "#636c6a", "#8b938f", "#b9beb8"),
  rail: ramp("#3a1417", "#5c2025", "#7d2f33", "#9c4542"),
  // accents
  g: ramp("#16301f", "#245a3d", "#3f8f62", "#7fd3a0", "#c6f2d6"),
  am: ramp("#4a2e10", "#8a5718", "#c98a2a", "#f0b85a", "#ffe2a6"),
  red: ramp("#3d0f15", "#7a1e28", "#b23a44", "#e8707a"),
  brass: ramp("#3b2a16", "#5f4423", "#8a6634", "#b58f4f", "#d9b878"),
  // night sea and moonlit hull
  sea: ramp("#07080f", "#0b0d19", "#0f1324", "#141a31", "#1a2340", "#222e52"),
  sky: ramp("#0b0a14", "#12111f", "#1a182c", "#24213a"),
  hull: ramp("#121730", "#1a2246", "#243060", "#30407d", "#40549b", "#5a72bb", "#8197d6"),
  // interior walls (warm, lit by lamps) and cool control-room light
  wl: ramp("#1a1414", "#261d1b", "#352824", "#47362e", "#5d4639", "#775a47"),
  wc: ramp("#141a1c", "#1c2528", "#263336", "#334448", "#45595d"),
  // operator
  skin: ramp("#3f2224", "#64343a", "#8a4c4f", "#ab6662", "#c5827a", "#d9a093", "#ebbfae"),
  // portrait bulkhead: plum-grey, a step lighter than the scene walls (the lamp is close)
  pw: ramp("#17141a", "#211c23", "#2c252e", "#383039", "#463c47", "#574b58", "#6b5e6b"),
  hair: ramp("#140e0d", "#22180f", "#33251a"),
  cap: ramp("#0f1016", "#171923", "#212432", "#2e3244", "#3f4459"),
  uni: ramp("#191c15", "#23271d", "#2e3426", "#3b4331", "#4b543e", "#5f6a4e"),
  bake: ramp("#0d0d0e", "#181818", "#242424", "#343434", "#4a4a4a", "#6a6a6a"), // headphone bakelite
  pad: ramp("#2a1a14", "#3e271c", "#553627"),
  eyeW: rgb("#b9a49c"), iris: rgb("#3b2e2b"), rim: rgb("#2e2526"), rimHi: rgb("#9a8a78"), lens: rgb("#d4d9dc"),
  lamp: ramp("#7a5520", "#c9933c", "#f2cf7e", "#fff0c4"),
} as const;
