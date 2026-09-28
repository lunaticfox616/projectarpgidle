// Item bases: what an item is called and how it looks, by kind and item level. Pictures are the
// old game's illustrated item art (assets/items/illustrated/<icon>.webp).
import type { AffixStat, ClassId, EquipSlot, ItemKind } from '../core/types.ts';

export interface ItemBase {
  id: string;
  kind: ItemKind;
  name: string;
  /** File name under assets/items/illustrated/, without extension. */
  icon: string;
  /** Lowest item level that can drop this base. */
  minLevel: number;
  /** Only these classes find it; all classes when absent. */
  classes?: readonly ClassId[];
}

export const EQUIP_SLOTS: readonly EquipSlot[] = ['weapon', 'offhand', 'helmet', 'armor', 'gloves', 'boots', 'belt', 'amulet', 'ring', 'ring2'];
export const ITEM_KINDS: readonly ItemKind[] = ['weapon', 'offhand', 'helmet', 'armor', 'gloves', 'boots', 'belt', 'amulet', 'ring'];

/** The kind of item a slot takes. */
export const slotKind = (slot: EquipSlot): ItemKind => (slot === 'ring2' ? 'ring' : slot);

/** Bag footprint in cells (width, height), as in the old game's grid bag. */
export const ITEM_SIZE: Record<ItemKind, [number, number]> = {
  weapon: [1, 3], offhand: [2, 2], helmet: [2, 2], armor: [2, 3], gloves: [2, 2], boots: [2, 2], belt: [2, 1], amulet: [1, 1], ring: [1, 1]
};

/** Which affixes each kind can roll, with relative weights. */
export const AFFIX_POOL: Record<ItemKind, Partial<Record<AffixStat, number>>> = {
  weapon: { flatDamage: 4, pctAttackSpeed: 2 },
  offhand: { flatArmor: 3, flatHp: 2, flatDamage: 1 },
  helmet: { flatHp: 3, flatArmor: 2 },
  armor: { flatHp: 3, flatArmor: 3 },
  gloves: { flatArmor: 2, pctAttackSpeed: 2, flatDamage: 1 },
  boots: { flatHp: 2, flatArmor: 2 },
  belt: { flatHp: 4, flatArmor: 1 },
  amulet: { flatDamage: 2, flatHp: 2, pctAttackSpeed: 1 },
  ring: { flatDamage: 2, flatHp: 1, pctAttackSpeed: 1, flatArmor: 1 }
};

/** How often each kind drops relative to the others. */
export const KIND_WEIGHT: Record<ItemKind, number> = {
  weapon: 1.3, offhand: 1, helmet: 1, armor: 1, gloves: 1, boots: 1, belt: 0.8, amulet: 0.7, ring: 1
};

const W: readonly ClassId[] = ['warrior'], A: readonly ClassId[] = ['arcanist'];
const base = (kind: ItemKind, id: string, name: string, icon: string, minLevel: number, classes?: readonly ClassId[]): ItemBase =>
  ({ id, kind, name, icon, minLevel, ...(classes ? { classes } : {}) });

export const ITEM_BASES: readonly ItemBase[] = [
  base('weapon', 'rusted-blade', '녹슨 검', 'rusted_blade', 1, W),
  base('weapon', 'root-fang', '뿌리송곳 검', 'root_blade_fang', 9, W),
  base('weapon', 'executioner', '처형인의 검', 'executioner_blade', 18, W),
  base('weapon', 'doomcleaver', '파멸의 대검', 'doomcleaver_blade', 26, W),
  base('weapon', 'echo-focus', '메아리 오브', 'echo_focus', 1, A),
  base('weapon', 'ether-focus', '에테르 오브', 'ether_focus', 9, A),
  base('weapon', 'starlit-focus', '별빛 오브', 'starlit_focus', 18, A),
  base('weapon', 'archon-focus', '집정관의 오브', 'archon_focus', 26, A),
  base('offhand', 'buckler-scrap', '조각난 버클러', 'buckler_scrap', 1, W),
  base('offhand', 'iron-buckler', '강철 버클러', 'iron_buckler', 9, W),
  base('offhand', 'ward-kite', '수호의 연방패', 'ward_kite', 18, W),
  base('offhand', 'tower-wall', '성벽 방패', 'tower_wall', 26, W),
  base('offhand', 'moon-barrier', '달빛 결계석', 'moon_barrier', 1, A),
  base('offhand', 'mirage-guard', '신기루 결계석', 'mirage_guard', 9, A),
  base('offhand', 'astral-barrier', '별자리 결계석', 'astral_barrier', 18, A),
  base('offhand', 'seraphim-aegis', '치천사의 결계석', 'seraphim_aegis', 26, A),
  base('helmet', 'cloth-hood', '천 두건', 'cloth_hood', 1),
  base('helmet', 'war-helm', '전투 투구', 'war_helm', 9),
  base('helmet', 'guardian-helm', '수호자의 투구', 'guardian_helm', 18),
  base('helmet', 'obsidian-helm', '흑요석 투구', 'obsidian_helm', 26),
  base('armor', 'leather-vest', '가죽 조끼', 'leather_vest', 1),
  base('armor', 'templar-mail', '성전사 사슬갑옷', 'templar_mail', 9),
  base('armor', 'plate-mail', '판금 갑옷', 'plate_mail', 18),
  base('armor', 'dread-plate', '공포의 판금', 'dread_plate', 26),
  base('gloves', 'hide-gloves', '가죽 장갑', 'hide_gloves', 1),
  base('gloves', 'grip-gauntlets', '악력 건틀릿', 'grip_gauntlets', 9),
  base('gloves', 'ward-gauntlets', '수호 건틀릿', 'ward_gauntlets', 18),
  base('gloves', 'warhands', '전쟁의 손', 'warhands', 26),
  base('boots', 'rag-boots', '누더기 장화', 'rag_boots', 1),
  base('boots', 'ranger-boots', '순찰자 장화', 'ranger_boots', 9),
  base('boots', 'iron-tread', '강철 발걸음', 'iron_tread', 18),
  base('boots', 'windguard-boots', '바람막이 장화', 'windguard_boots', 26),
  base('belt', 'rope-belt', '밧줄 허리띠', 'rope_belt', 1),
  base('belt', 'war-belt', '전투 허리띠', 'war_belt', 9),
  base('belt', 'graveknot-belt', '무덤매듭 허리띠', 'graveknot_belt', 18),
  base('belt', 'warlord-girdle', '군주의 허리띠', 'warlord_girdle', 26),
  base('amulet', 'bone-amulet', '뼈 목걸이', 'bone_amulet', 1),
  base('amulet', 'sage-amulet', '현자의 목걸이', 'sage_amulet', 9),
  base('amulet', 'valor-amulet', '용맹의 목걸이', 'valor_amulet', 18),
  base('amulet', 'star-pendant', '별 목걸이', 'star_pendant', 26),
  base('ring', 'copper-ring', '구리 반지', 'copper_ring', 1),
  base('ring', 'opal-ring', '오팔 반지', 'opal_ring', 9),
  base('ring', 'sapphire-band', '사파이어 고리', 'sapphire_band', 18),
  base('ring', 'moonbound-ring', '달에 묶인 반지', 'moonbound_ring', 26)
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
