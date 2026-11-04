// Minimal ambient declarations for the few Node built-ins used by tools/art and its tests (avoids adding @types/node).
declare module "node:zlib" { export function deflateSync(b: Uint8Array, o?: { level?: number }): Uint8Array; export function inflateSync(b: Uint8Array): Uint8Array; }
declare module "node:crypto" { export function createHash(a: string): { update(b: Uint8Array | string): { digest(e: "hex"): string } }; }
declare module "node:fs" {
  export function mkdirSync(p: string, o?: { recursive?: boolean }): void;
  export function writeFileSync(p: string, d: Uint8Array | string): void;
  export function readFileSync(p: string): Uint8Array;
  export function existsSync(p: string): boolean;
}
