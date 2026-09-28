// Save boundary of the rules core: the only place that turns untrusted JSON back into a GameState.
// Storage (localStorage, cloud) lives in the web layer; this module is pure and runs in Node tests.
import { CLASSES } from '../data/balance.ts';
import { AFFIXES } from '../data/affixes.ts';
import { ACT_PRESETS } from '../data/act-maps.ts';
import { EQUIP_SLOTS, ITEM_KINDS, basesFor, isItemBase, slotKind } from '../data/item-bases.ts';
import { actMap, isFloor } from './map.ts';
import { isAffixId } from './affixes.ts';
import type { Affix, ClassId, CurrencyKey, EquipSlot, GameState, Item, ItemKind, Settings } from './types.ts';

const CURRENCIES: readonly CurrencyKey[] = ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'blightSpore', 'bossCore', 'challengeMark'];
const RARITIES: readonly Item['rarity'][] = ['normal', 'magic', 'rare'];

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function check(condition: boolean, what: string): asserts condition {
  if (!condition) throw new Error(`save rejected: ${what}`);
}

/** Pre-crafting saves stored { stat, value }; each maps to the imported option of the same stat. */
const LEGACY_STAT: Record<string, (kind: ItemKind) => string | null> = {
  flatHp: () => 'flatHp',
  pctAttackSpeed: () => 'aspd',
  flatArmor: () => 'armor',
  flatDamage: kind => ({ weapon: 'flatDmg', ring: 'ringFlatDmg', gloves: 'gloveFlatDmg', amulet: 'accessoryFlatDmg', belt: 'accessoryFlatDmg' } as Partial<Record<ItemKind, string>>)[kind] ?? null
};

/**
 * Convert a legacy affix, keeping its value and taking the tier whose range is nearest to it.
 * Returns null when the new table has no option for that stat on this kind (e.g. flat damage on
 * body armour); only those lines are dropped, the item itself is kept.
 */
function migrateLegacyAffix(raw: Json, kind: ItemKind): Affix | null {
  const id = LEGACY_STAT[String(raw.stat)]?.(kind);
  const def = id ? AFFIXES.find(d => d.id === id && d.kinds.includes(kind)) : undefined;
  if (!def || !isNumber(raw.value)) return null;
  const value = raw.value;
  const distance = ([min, max]: [number, number]) => (value < min ? min - value : value > max ? value - max : 0);
  const tier = def.tiers.reduce((best, range, i) => (distance(range) < distance(def.tiers[best]!) ? i : best), 0) + 1;
  return { mod: def.id, tier, value };
}

const isAffix = (a: unknown): a is Affix => isObject(a) && isAffixId(a.mod) && Number.isInteger(a.tier) && (a.tier as number) >= 1
  && (a.tier as number) <= 20 && isNumber(a.value) && (a.extra === undefined || isNumber(a.extra));

/**
 * Validate one saved item. Items written before bases existed get the base their kind and level
 * would drop now (the lowest eligible one, so the result never depends on randomness), and
 * pre-crafting affixes are converted (migrateLegacyAffix).
 */
function checkItem(item: unknown, where: string, classId: ClassId): asserts item is Item {
  check(isObject(item) && isCount(item.id) && isCount(item.itemLevel), `${where} is not an item`);
  check(ITEM_KINDS.includes(item.slot as ItemKind) && RARITIES.includes(item.rarity as Item['rarity']), `${where} slot or rarity`);
  check(Array.isArray(item.affixes), `${where} affixes`);
  item.affixes = item.affixes.map(a => (isObject(a) && 'stat' in a ? migrateLegacyAffix(a, item.slot as ItemKind) : a)).filter(a => a !== null);
  check((item.affixes as unknown[]).every(isAffix), `${where} affixes`);
  if (!isItemBase(item.base)) {
    const fallback = basesFor(item.slot as ItemKind, classId, Math.max(1, item.itemLevel as number))[0];
    check(fallback !== undefined, `${where} has no base for its kind`);
    item.base = fallback.id;
  }
}

function checkRun(run: unknown, classId: ClassId): void {
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
  run.loot.items.forEach((item, i) => checkItem(item, `loot item ${i}`, classId));
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
  const classId = raw.classId as ClassId;
  raw.inventory.forEach((item, i) => checkItem(item, `inventory item ${i}`, classId));
  for (const [slot, item] of Object.entries(raw.equipment)) {
    check(EQUIP_SLOTS.includes(slot as EquipSlot), `unknown equipment slot ${slot}`);
    checkItem(item, `equipped ${slot}`, classId);
    check(item.slot === slotKind(slot as EquipSlot), `item in the wrong slot ${slot}`);
  }
  checkRun(raw.run, classId);
  return { ...(raw as unknown as GameState), settings: restoreSettings(raw.settings) };
}
