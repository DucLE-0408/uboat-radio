// Pure mapping from observable state to sprite poses. Vietnamese: không RNG, không DOM => test được.
export type BoatMode = "surface" | "periscope" | "dive";

export interface BoatPose {
  /** Logical px the boat sinks below its surface position (the water layer in front hides it). */
  readonly dy: number;
  /** Milliseconds per propeller turn, or null when the screw is still. */
  readonly propMs: number | null;
  /** Hull damage overlay level: -1 none, 0 light, 1 heavy, 2 critical. */
  readonly crack: number;
  readonly alarm: boolean;
}

const DY: Readonly<Record<BoatMode, number>> = { surface: 0, periscope: 22, dive: 38 };

export function boatPose(mode: BoatMode, speedKn: number, hull: number, emergency: boolean): BoatPose {
  const propMs = speedKn < 0.3 ? null : Math.round(Math.min(900, Math.max(120, 900 - speedKn * 55)));
  const crack = hull > 85 ? -1 : hull > 55 ? 0 : hull > 25 ? 1 : 2;
  return { dy: DY[mode], propMs, crack, alarm: emergency };
}

export const PORTRAIT_FRAMES = { idle: 0, blink: 1, listening: 2, writing: 3, alert: 4, hurt: 5 } as const;
export type PortraitPose = keyof typeof PORTRAIT_FRAMES;

export interface PortraitInput {
  readonly emergency: boolean;
  readonly hurtRecent: boolean;
  readonly typingRecent: boolean;
  readonly listening: boolean;
  readonly blinking: boolean;
}

/** Priority: hurt > alert > writing > listening > blink > idle. */
export function portraitPose(i: PortraitInput): PortraitPose {
  if (i.hurtRecent) return "hurt";
  if (i.emergency) return "alert";
  if (i.typingRecent) return "writing";
  if (i.listening) return "listening";
  return i.blinking ? "blink" : "idle";
}
