// Shapes of the equipment option table (data/affixes.ts, imported from the old game).
import type { ClassId, ItemKind } from '../core/types.ts';

/** Every stat an option can raise. Percent stats are whole percents (12 = 12%). */
export type StatId =
  | 'flatDmg' | 'weaponDmgPct' | 'pctDmg' | 'attackPctDmg' | 'meleePctDmg' | 'projectilePctDmg' | 'physPctDmg' | 'elementalPctDmg'
  | 'flatHp' | 'pctHp' | 'armor' | 'armorPct' | 'dr' | 'aspd' | 'crit' | 'critDmg' | 'move'
  | 'resF' | 'resC' | 'resL' | 'resAll' | 'resChaos' | 'regen' | 'leech' | 'ds';

export interface AffixDef {
  id: string;
  type: 'prefix' | 'suffix';
  name: string;
  stat: StatId;
  kinds: ItemKind[];
  /** Relative chance among the options an item can take. */
  weight: number;
  /** Rolled values are multiples of this. */
  step: number;
  /** [min, max] for tiers 1..20; tier 20 is the strongest (old game's T20). */
  tiers: [number, number][];
  /** Only these classes find it (class-specific attack types). */
  classes?: ClassId[];
  /** Second stat rolled at the same tier (old compound options). */
  extra?: { stat: StatId; name: string; step: number; tiers: [number, number][] };
}
