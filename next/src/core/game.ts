// Public entry of the rules core. One step() is one fixed tick; live play, offline settlement,
// tests and the autoplay tool all advance the game through the same function.
import { ACT_PRESETS } from '../data/act-maps.ts';
import { MAX_OFFLINE_MS, TICK_MS } from '../data/balance.ts';
import { equipUpgrades } from './items.ts';
import { seedRng } from './rng.ts';
import { startRun, tickRun } from './run.ts';
import { stats } from './stats.ts';
import type { ClassId, GameEvent, GameState, Settings } from './types.ts';

export const LAST_ACT = ACT_PRESETS.length;

export function createGame(seed: number, classId: ClassId, settings: Partial<Settings> = {}): GameState {
  const state: GameState = {
    version: 1, seed: seed >>> 0, rng: seedRng(seed), timeMs: 0, nextId: 1, classId, level: 1, exp: 0, hp: 0,
    equipment: {}, inventory: [],
    currencies: { magicBud: 0, sapBud: 0, formlessDew: 0, goldenRule: 0, blightSpore: 0, bossCore: 0, challengeMark: 0 },
    buildRevision: 0, actsCleared: 0, deaths: 0,
    settings: { exploreMode: 'boss', autoContinue: true, autoEquip: true, ...settings },
    run: null
  };
  state.hp = stats(state).maxHp;
  startRun(state, 1);
  return state;
}

/** The act the next run plays: onward after a clear when auto-continue is on, else a retry. */
function nextAct(state: GameState, act: number, cleared: boolean): number {
  return cleared && state.settings.autoContinue ? Math.min(LAST_ACT, act + 1) : act;
}

/** Advance the game by one TICK_MS and return what happened. */
export function step(state: GameState): GameEvent[] {
  const run = state.run;
  if (!run) throw new Error('step() on a game without a run; createGame() always starts one');
  const events: GameEvent[] = [];
  state.timeMs += TICK_MS;
  if (run.status === 'active') {
    tickRun(state, run, events);
    if (state.settings.autoEquip && events.some(e => e.type === 'actCleared')) {
      const itemIds = equipUpgrades(state);
      if (itemIds.length > 0) events.push({ type: 'itemsEquipped', itemIds });
    }
    return events;
  }
  run.restMs -= TICK_MS;
  if (run.restMs <= 0) events.push(...startRun(state, nextAct(state, run.act, run.status === 'cleared')));
  return events;
}

/**
 * Advance by elapsed wall time (offline settlement), capped at MAX_OFFLINE_MS.
 * @param ms elapsed time; ms. The part shorter than one tick is returned for the caller to carry.
 */
export function advance(state: GameState, ms: number, onEvent?: (event: GameEvent) => void): { ticks: number; leftoverMs: number } {
  const usable = Math.min(Math.max(0, ms), MAX_OFFLINE_MS);
  const ticks = Math.floor(usable / TICK_MS);
  for (let i = 0; i < ticks; i++) for (const event of step(state)) onEvent?.(event);
  return { ticks, leftoverMs: usable - ticks * TICK_MS };
}
