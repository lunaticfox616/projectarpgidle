// Browser storage boundary: the save envelope in localStorage and per-device preferences.
// Validation of the game itself is the core's restoreGame(); this module only handles the medium.
import { restoreGame } from '../core/save.ts';
import type { GameState } from '../core/types.ts';

const SAVE_KEY = 'rignin-next.save.v1';
const BROKEN_KEY = 'rignin-next.save.broken';
const PREFS_KEY = 'rignin-next.prefs';

export type LoadResult =
  | { kind: 'none' }
  | { kind: 'ok'; state: GameState; savedAt: number }
  | { kind: 'broken'; reason: string };

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('storage: localStorage unavailable', error);
    return null;
  }
}

/** Read the save. A save that cannot be restored is moved aside (never deleted) and reported. */
export function readSave(): LoadResult {
  const store = storage(), raw = store?.getItem(SAVE_KEY);
  if (!store || !raw) return { kind: 'none' };
  try {
    const envelope = JSON.parse(raw) as { savedAt?: unknown; state?: unknown };
    if (typeof envelope.savedAt !== 'number' || !Number.isFinite(envelope.savedAt)) throw new Error('save rejected: savedAt');
    return { kind: 'ok', state: restoreGame(envelope.state), savedAt: envelope.savedAt };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error('storage: save could not be restored; kept as', BROKEN_KEY, error);
    store.setItem(BROKEN_KEY, raw);
    store.removeItem(SAVE_KEY);
    return { kind: 'broken', reason };
  }
}

/** Returns false when the browser refused the write (quota, private mode); the caller tells the player. */
export function writeSave(state: GameState, savedAt: number): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(SAVE_KEY, JSON.stringify({ savedAt, state }));
    return true;
  } catch (error) {
    console.error('storage: save failed', error);
    return false;
  }
}

export function clearSave(): void {
  storage()?.removeItem(SAVE_KEY);
}

export interface Prefs { speed: 1 | 2 | 4 }

export function readPrefs(): Prefs {
  try {
    const raw = JSON.parse(storage()?.getItem(PREFS_KEY) ?? '{}') as { speed?: unknown };
    return { speed: raw.speed === 2 || raw.speed === 4 ? raw.speed : 1 };
  } catch (error) {
    console.warn('storage: preferences unreadable, using defaults', error);
    return { speed: 1 };
  }
}

export function writePrefs(prefs: Prefs): void {
  try {
    storage()?.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.warn('storage: preferences not saved', error);
  }
}
