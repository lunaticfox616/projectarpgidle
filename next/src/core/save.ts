// Save boundary of the rules core: the only place that turns untrusted JSON back into a GameState.
// Storage (localStorage, cloud) lives in the web layer; this module is pure and runs in Node tests.
import { CLASSES, ITEMS } from '../data/balance.ts';
import { ACT_PRESETS } from '../data/act-maps.ts';
import { actMap, isFloor } from './map.ts';
import type { AffixStat, CurrencyKey, GameState, Item, Settings } from './types.ts';

const CURRENCIES: readonly CurrencyKey[] = ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'blightSpore', 'bossCore', 'challengeMark'];
const AFFIXES = Object.keys(ITEMS.affix) as AffixStat[];
const RARITIES: readonly Item['rarity'][] = ['normal', 'magic', 'rare'];

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function check(condition: boolean, what: string): asserts condition {
  if (!condition) throw new Error(`save rejected: ${what}`);
}

function checkItem(item: unknown, where: string): asserts item is Item {
  check(isObject(item) && isCount(item.id) && isCount(item.itemLevel), `${where} is not an item`);
  check(ITEMS.slots.includes(item.slot as Item['slot']) && RARITIES.includes(item.rarity as Item['rarity']), `${where} slot or rarity`);
  check(Array.isArray(item.affixes) && item.affixes.every(a => isObject(a) && AFFIXES.includes(a.stat as AffixStat) && isNumber(a.value)), `${where} affixes`);
}

function checkRun(run: unknown): void {
  check(isObject(run), 'run missing');
  check(Number.isInteger(run.act) && (run.act as number) >= 1 && (run.act as number) <= ACT_PRESETS.length, 'run act out of range');
  const map = actMap(run.act as number);
  check(['active', 'cleared', 'failed'].includes(run.status as string), 'run status');
  check(isObject(run.player) && isNumber(run.player.moveMs) && isNumber(run.player.attackMs), 'run player');
  check(isFloor(map, run.player as { x: number; y: number }), 'player stands in a wall');
  check(Array.isArray(run.fog) && run.fog.length === map.tiles.length, 'fog size');
  check(Array.isArray(run.enemies) && run.enemies.every(e => isObject(e) && isFloor(map, e as { x: number; y: number }) && isNumber(e.hp)), 'enemies');
  check(Array.isArray(run.packs) && typeof run.gateOpen === 'boolean' && isNumber(run.restMs), 'run progress');
  check(isObject(run.loot) && isObject(run.loot.currencies) && Array.isArray(run.loot.items), 'run loot');
  run.loot.items.forEach((item, i) => checkItem(item, `loot item ${i}`));
}

/** Settings added after a save was written take their defaults here. */
function restoreSettings(raw: unknown): Settings {
  const s = isObject(raw) ? raw : {};
  return {
    exploreMode: s.exploreMode === 'full' ? 'full' : 'boss',
    autoContinue: typeof s.autoContinue === 'boolean' ? s.autoContinue : true,
    autoEquip: typeof s.autoEquip === 'boolean' ? s.autoEquip : true
  };
}

/**
 * Validate a parsed save and return it as a GameState. Throws "save rejected: …" on anything a
 * running game could not continue from; the caller decides whether to keep the broken copy.
 */
export function restoreGame(raw: unknown): GameState {
  check(isObject(raw), 'not an object');
  check(raw.version === 1, `unknown version ${String(raw.version)}`);
  check(typeof raw.classId === 'string' && raw.classId in CLASSES, 'class');
  check(Array.isArray(raw.rng) && raw.rng.length === 4 && raw.rng.every(w => isCount(w) && w <= 0xffffffff), 'rng');
  for (const key of ['seed', 'timeMs', 'nextId', 'level', 'exp', 'buildRevision', 'actsCleared', 'deaths'] as const) check(isCount(raw[key]), key);
  check((raw.level as number) >= 1 && isNumber(raw.hp), 'level or life');
  check(isObject(raw.currencies) && CURRENCIES.every(k => isCount((raw.currencies as Json)[k])), 'currencies');
  check(Array.isArray(raw.inventory) && isObject(raw.equipment), 'items');
  raw.inventory.forEach((item, i) => checkItem(item, `inventory item ${i}`));
  for (const [slot, item] of Object.entries(raw.equipment)) {
    checkItem(item, `equipped ${slot}`);
    check(item.slot === slot, `item in the wrong slot ${slot}`);
  }
  checkRun(raw.run);
  return { ...(raw as unknown as GameState), settings: restoreSettings(raw.settings) };
}
