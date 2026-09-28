// Display names. Pure data: no rules depend on these strings.
import type { AffixStat, ClassId, CurrencyKey, Item, Slot } from '../core/types.ts';

export const CURRENCY_NAMES: Record<CurrencyKey, string> = {
  magicBud: '마법의 새싹', sapBud: '수액 봉오리', formlessDew: '형체 없는 이슬', goldenRule: '황금률',
  blightSpore: '마름병 포자', bossCore: '군주의 핵', challengeMark: '도전의 증표'
};

export const SLOT_NAMES: Record<Slot, string> = { weapon: '무기', armor: '갑옷', ring: '반지' };

export const RARITY_NAMES: Record<Item['rarity'], string> = { normal: '일반', magic: '마법', rare: '희귀' };

/** Affix line, e.g. "피해 +12". Percent stats carry their unit. */
export function affixText(stat: AffixStat, value: number): string {
  const label: Record<AffixStat, string> = { flatDamage: '피해', flatHp: '최대 생명력', pctAttackSpeed: '공격 속도', flatArmor: '방어도' };
  return `${label[stat]} +${value}${stat === 'pctAttackSpeed' ? '%' : ''}`;
}

const BASES: Record<ClassId, Record<Slot, readonly string[]>> = {
  warrior: {
    weapon: ['뿌리 대검', '옹이 대검', '가시 대검', '고목 참도'],
    armor: ['나무껍질 흉갑', '뿌리 사슬갑옷', '수액 가죽갑옷', '옹이 판금'],
    ring: ['호박 반지', '씨앗 반지', '이끼 인장', '뿌리 고리']
  },
  arcanist: {
    weapon: ['수정 오브', '씨앗 오브', '이슬 구슬', '별빛 오브'],
    armor: ['이끼 로브', '수액 비단옷', '잎맥 로브', '밤나무 외투'],
    ring: ['호박 반지', '씨앗 반지', '이끼 인장', '뿌리 고리']
  }
};
const PREFIXES = ['굶주린', '속삭이는', '황금빛', '썩지 않는', '맹렬한', '고요한', '타오르는', '서리 낀'];
const RARE_SUFFIXES = ['의 서약', '의 맹세', '의 잔향', '의 파수꾼', '의 심장', '의 뿌리'];

/** Stable display name of an item, derived from its id so it never changes between renders. */
export function itemName(item: Item, classId: ClassId): string {
  const bases = BASES[classId][item.slot];
  const base = bases[item.id % bases.length]!;
  if (item.rarity === 'normal') return base;
  const prefix = PREFIXES[(item.id * 7) % PREFIXES.length]!;
  if (item.rarity === 'magic') return `${prefix} ${base}`;
  return `${prefix} ${base}${RARE_SUFFIXES[(item.id * 3) % RARE_SUFFIXES.length]!}`;
}
