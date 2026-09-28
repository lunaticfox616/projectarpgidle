// Item bases: what an item is called and what it gives, by kind and item level. Icons are drawn in
// code from the kind and base tier (web/icons.ts).
import type { ClassId, EquipSlot, ItemKind } from '../core/types.ts';
import type { StatId } from './affix-types.ts';

export interface ItemBase {
  id: string;
  kind: ItemKind;
  name: string;
  /** Lowest item level that can drop this base. */
  minLevel: number;
  /** Only these classes find it; all classes when absent. */
  classes?: readonly ClassId[];
  /** Base stat every item of this base has, even a normal one (old baseStats). */
  implicit: { stat: StatId; value: number };
}

export const EQUIP_SLOTS: readonly EquipSlot[] = ['weapon', 'offhand', 'helmet', 'armor', 'gloves', 'boots', 'belt', 'amulet', 'ring', 'ring2'];
export const ITEM_KINDS: readonly ItemKind[] = ['weapon', 'offhand', 'helmet', 'armor', 'gloves', 'boots', 'belt', 'amulet', 'ring'];

/** The kind of item a slot takes. */
export const slotKind = (slot: EquipSlot): ItemKind => (slot === 'ring2' ? 'ring' : slot);

/** Bag footprint in cells (width, height), as in the old game's grid bag. */
export const ITEM_SIZE: Record<ItemKind, [number, number]> = {
  weapon: [1, 3], offhand: [2, 2], helmet: [2, 2], armor: [2, 3], gloves: [2, 2], boots: [2, 2], belt: [2, 1], amulet: [1, 1], ring: [1, 1]
};

/** How often each kind drops relative to the others. */
export const KIND_WEIGHT: Record<ItemKind, number> = {
  weapon: 1.3, offhand: 1, helmet: 1, armor: 1, gloves: 1, boots: 1, belt: 0.8, amulet: 0.7, ring: 1
};

const W: readonly ClassId[] = ['warrior'], A: readonly ClassId[] = ['arcanist'];
/** Base stat by kind and base tier (0..3, by minLevel 1/9/18/26). */
const IMPLICIT: Record<ItemKind, { stat: StatId; values: [number, number, number, number] }> = {
  weapon: { stat: 'flatDmg', values: [4, 9, 15, 22] },
  offhand: { stat: 'armor', values: [10, 22, 36, 52] },
  helmet: { stat: 'armor', values: [8, 18, 30, 44] },
  armor: { stat: 'armor', values: [14, 30, 50, 72] },
  gloves: { stat: 'armor', values: [6, 14, 24, 36] },
  boots: { stat: 'armor', values: [6, 14, 24, 36] },
  belt: { stat: 'flatHp', values: [12, 26, 42, 60] },
  amulet: { stat: 'crit', values: [1, 1.5, 2, 2.5] },
  ring: { stat: 'resAll', values: [3, 5, 7, 9] }
};
const TIER_OF_LEVEL: Record<number, number> = { 1: 0, 9: 1, 18: 2, 26: 3 };

const base = (kind: ItemKind, id: string, name: string, minLevel: number, classes?: readonly ClassId[]): ItemBase => {
  const implicit = IMPLICIT[kind], tier = TIER_OF_LEVEL[minLevel] ?? 0;
  // The arcanist's warding stone guards life rather than armor.
  const stat: StatId = kind === 'offhand' && classes?.includes('arcanist') ? 'flatHp' : implicit.stat;
  return { id, kind, name, minLevel, implicit: { stat, value: implicit.values[tier]! }, ...(classes ? { classes } : {}) };
};

export const ITEM_BASES: readonly ItemBase[] = [
  base('weapon', 'rusted-blade', '녹슨 검', 1, W),
  base('weapon', 'root-fang', '뿌리송곳 검', 9, W),
  base('weapon', 'executioner', '처형인의 검', 18, W),
  base('weapon', 'doomcleaver', '파멸의 대검', 26, W),
  base('weapon', 'echo-focus', '메아리 오브', 1, A),
  base('weapon', 'ether-focus', '에테르 오브', 9, A),
  base('weapon', 'starlit-focus', '별빛 오브', 18, A),
  base('weapon', 'archon-focus', '집정관의 오브', 26, A),
  base('offhand', 'buckler-scrap', '조각난 버클러', 1, W),
  base('offhand', 'iron-buckler', '강철 버클러', 9, W),
  base('offhand', 'ward-kite', '수호의 연방패', 18, W),
  base('offhand', 'tower-wall', '성벽 방패', 26, W),
  base('offhand', 'moon-barrier', '달빛 결계석', 1, A),
  base('offhand', 'mirage-guard', '신기루 결계석', 9, A),
  base('offhand', 'astral-barrier', '별자리 결계석', 18, A),
  base('offhand', 'seraphim-aegis', '치천사의 결계석', 26, A),
  base('helmet', 'cloth-hood', '천 두건', 1),
  base('helmet', 'war-helm', '전투 투구', 9),
  base('helmet', 'guardian-helm', '수호자의 투구', 18),
  base('helmet', 'obsidian-helm', '흑요석 투구', 26),
  base('armor', 'leather-vest', '가죽 조끼', 1),
  base('armor', 'templar-mail', '성전사 사슬갑옷', 9),
  base('armor', 'plate-mail', '판금 갑옷', 18),
  base('armor', 'dread-plate', '공포의 판금', 26),
  base('gloves', 'hide-gloves', '가죽 장갑', 1),
  base('gloves', 'grip-gauntlets', '악력 건틀릿', 9),
  base('gloves', 'ward-gauntlets', '수호 건틀릿', 18),
  base('gloves', 'warhands', '전쟁의 손', 26),
  base('boots', 'rag-boots', '누더기 장화', 1),
  base('boots', 'ranger-boots', '순찰자 장화', 9),
  base('boots', 'iron-tread', '강철 발걸음', 18),
  base('boots', 'windguard-boots', '바람막이 장화', 26),
  base('belt', 'rope-belt', '밧줄 허리띠', 1),
  base('belt', 'war-belt', '전투 허리띠', 9),
  base('belt', 'graveknot-belt', '무덤매듭 허리띠', 18),
  base('belt', 'warlord-girdle', '군주의 허리띠', 26),
  base('amulet', 'bone-amulet', '뼈 목걸이', 1),
  base('amulet', 'sage-amulet', '현자의 목걸이', 9),
  base('amulet', 'valor-amulet', '용맹의 목걸이', 18),
  base('amulet', 'star-pendant', '별 목걸이', 26),
  base('ring', 'copper-ring', '구리 반지', 1),
  base('ring', 'opal-ring', '오팔 반지', 9),
  base('ring', 'sapphire-band', '사파이어 고리', 18),
  base('ring', 'moonbound-ring', '달에 묶인 반지', 26)
];

const byId = new Map(ITEM_BASES.map(b => [b.id, b]));

export function itemBase(id: string): ItemBase {
  const found = byId.get(id);
  if (!found) throw new Error(`unknown item base ${id}`);
  return found;
}

export const isItemBase = (id: unknown): boolean => typeof id === 'string' && byId.has(id);

/** Bases of a kind a class can find at an item level, lowest first. */
export function basesFor(kind: ItemKind, classId: ClassId, itemLevel: number): ItemBase[] {
  return ITEM_BASES.filter(b => b.kind === kind && b.minLevel <= itemLevel && (!b.classes || b.classes.includes(classId)));
}
