// Seeded randomness. The generator state lives in GameState.rng, so the same save plus the same
// elapsed time always produces the same game: live play, offline settlement and tests agree.
import type { GameState } from './types.ts';

/** Expand a 32-bit seed into sfc32 state (splitmix32), then discard the weak first outputs. */
export function seedRng(seed: number): [number, number, number, number] {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
  const state: [number, number, number, number] = [next(), next(), next(), next()];
  for (let i = 0; i < 12; i++) sfc32(state);
  return state;
}

/** One sfc32 step; mutates the state words and returns a float in [0, 1). */
function sfc32(st: [number, number, number, number]): number {
  let [a, b, c, d] = st;
  const t = (((a + b) >>> 0) + d) >>> 0;
  d = (d + 1) >>> 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) >>> 0;
  c = ((c << 21) | (c >>> 11)) >>> 0;
  c = (c + t) >>> 0;
  st[0] = a >>> 0; st[1] = b; st[2] = c; st[3] = d;
  return t / 4294967296;
}

export function random(state: GameState): number {
  return sfc32(state.rng);
}

export function chance(state: GameState, p: number): boolean {
  return random(state) < p;
}

/** Integer in [min, max], both inclusive. */
export function rollInt(state: GameState, min: number, max: number): number {
  return min + Math.floor(random(state) * (max - min + 1));
}

export function pick<T>(state: GameState, list: readonly T[]): T {
  const item = list[Math.floor(random(state) * list.length)];
  if (item === undefined) throw new Error('pick() from an empty list');
  return item;
}
