// Display names. Pure data: no rules depend on these strings.
import { itemBase } from './item-bases.ts';
import type { AffixStat, ClassId, CurrencyKey, EnemyKind, EquipSlot, Item, ItemKind } from '../core/types.ts';

export const CURRENCY_NAMES: Record<CurrencyKey, string> = {
  magicBud: '마법의 새싹', sapBud: '수액 봉오리', formlessDew: '형체 없는 이슬', goldenRule: '황금률',
  blightSpore: '마름병 포자', bossCore: '군주의 핵', challengeMark: '도전의 증표'
};

export const KIND_NAMES: Record<ItemKind, string> = {
  weapon: '무기', offhand: '보조', helmet: '투구', armor: '갑옷', gloves: '장갑', boots: '신발', belt: '허리띠', amulet: '목걸이', ring: '반지'
};
/** Slot labels; the offhand reads as what the class holds there. */
export function slotName(slot: EquipSlot, classId: ClassId): string {
  if (slot === 'offhand') return classId === 'warrior' ? '방패' : '결계석';
  return KIND_NAMES[slot === 'ring2' ? 'ring' : slot];
}

/** What the basic attack is called in the combat log. */
export const ATTACK_NAMES: Record<ClassId, string> = { warrior: '대검 베기', arcanist: '오브 탄' };

const NORMAL_NAMES = ['수액 흡충', '뿌리 거미', '수액 응집체'] as const;

/** Enemy display name; normals follow the species drawn for the act (art.ts rotates by act % 3). */
export function enemyName(act: number, kind: EnemyKind, bossName: string): string {
  if (kind === 'boss') return bossName;
  if (kind === 'elite') return '나무 인형 파수꾼';
  return NORMAL_NAMES[act % 3]!;
}

export const RARITY_NAMES: Record<Item['rarity'], string> = { normal: '일반', magic: '마법', rare: '희귀' };

/** Affix line, e.g. "피해 +12". Percent stats carry their unit. */
export function affixText(stat: AffixStat, value: number): string {
  const label: Record<AffixStat, string> = { flatDamage: '피해', flatHp: '최대 생명력', pctAttackSpeed: '공격 속도', flatArmor: '방어도' };
  return `${label[stat]} +${value}${stat === 'pctAttackSpeed' ? '%' : ''}`;
}

const PREFIXES = ['굶주린', '속삭이는', '황금빛', '썩지 않는', '맹렬한', '고요한', '타오르는', '서리 낀'];
const RARE_SUFFIXES = ['의 서약', '의 맹세', '의 잔향', '의 파수꾼', '의 심장', '의 뿌리'];

/** Stable display name of an item, derived from its base and id so it never changes between renders. */
export function itemName(item: Item): string {
  const base = itemBase(item.base).name;
  if (item.rarity === 'normal') return base;
  const prefix = PREFIXES[(item.id * 7) % PREFIXES.length]!;
  if (item.rarity === 'magic') return `${prefix} ${base}`;
  return `${prefix} ${base}${RARE_SUFFIXES[(item.id * 3) % RARE_SUFFIXES.length]!}`;
}
