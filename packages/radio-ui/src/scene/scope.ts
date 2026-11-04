// Subscription scope: everything a scene mounts registers its disposers here so unmounting leaves nothing behind (R2.5).
import type { Ctx } from "../ctx";
import type { Topic } from "../store";
import type { Reveal } from "./reveal";

export interface Scope {
  on(topics: readonly Topic[], fn: () => void): void;
  own(dispose: () => void): void;
  dispose(): void;
}
export type SceneCtx = Ctx & { readonly scope: Scope; readonly reveal: Reveal };

export function createScope(ctx: Ctx): Scope {
  const list: (() => void)[] = [];
  return {
    on: (topics, fn) => { list.push(ctx.store.on(topics, fn)); },
    own: (d) => { list.push(d); },
    dispose: () => { for (const d of list.splice(0)) d(); },
  };
}
