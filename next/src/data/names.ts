// Display names. Pure data: no rules depend on these strings.
import { itemBase } from './item-bases.ts';
import type { StatId } from './affix-types.ts';
import type { ClassId, CraftCurrency, CurrencyKey, EnemyKind, EquipSlot, Item, ItemKind } from '../core/types.ts';

export const CURRENCY_NAMES: Record<CurrencyKey, string> = {
  magicBud: '마법의 새싹', sapBud: '수액 봉오리', formlessDew: '형체 없는 이슬', goldenRule: '황금률',
  blightSpore: '마름병 포자', bossCore: '군주의 핵', challengeMark: '도전의 증표'
};

/** What each crafting currency does, shown on its button (old game's rules, see core/crafting.ts). */
export const CRAFT_HINTS: Record<CraftCurrency, string> = {
  magicBud: '일반 → 마법 · 마법 옵션 재굴림', sapBud: '마법 → 희귀 · 희귀 옵션 +1 (최대 6)',
  formlessDew: '일반 → 희귀 · 희귀 옵션 재굴림', goldenRule: '옵션 수치를 등급 안에서 재굴림', blightSpore: '옵션을 모두 지워 일반으로'
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

/** Enemy display name; normals follow the species drawn for the act (monsters.ts rotates by act % 3). */
export function enemyName(act: number, kind: EnemyKind, bossName: string): string {
  if (kind === 'boss') return bossName;
  if (kind === 'elite') return '나무 인형 파수꾼';
  return NORMAL_NAMES[act % 3]!;
}

export const RARITY_NAMES: Record<Item['rarity'], string> = { normal: '일반', magic: '마법', rare: '희귀' };

/** Short stat labels for option lines, comparisons and the stat sheet (old game's wording). */
export const STAT_NAMES: Record<StatId, string> = {
  flatDmg: '기본 피해', weaponDmgPct: '무기 기본 피해', pctDmg: '피해', attackPctDmg: '공격 피해', meleePctDmg: '근접 피해',
  projectilePctDmg: '투사체 피해', physPctDmg: '물리 피해', elementalPctDmg: '원소 피해', flatHp: '최대 생명력', pctHp: '생명력',
  armor: '방어도', armorPct: '방어도', dr: '물리 피해 감소', aspd: '공격 속도', crit: '치명타 확률', critDmg: '치명타 피해',
  move: '이동 속도', resF: '화염 저항', resC: '냉기 저항', resL: '번개 저항', resAll: '모든 원소 저항', resChaos: '카오스 저항',
  regen: '초당 재생', leech: '생명력 흡수', ds: '연속 타격'
};
const FLAT: ReadonlySet<StatId> = new Set(['flatDmg', 'flatHp', 'armor']);

/** "기본 피해 +12", "공격 속도 +8%"; negative values keep their sign. */
export function statText(stat: StatId, value: number): string {
  const n = Number.isInteger(value) ? String(Math.abs(value)) : Math.abs(value).toFixed(2).replace(/0$/, '');
  return `${STAT_NAMES[stat]} ${value < 0 ? '-' : '+'}${n}${FLAT.has(stat) ? '' : '%'}`;
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
