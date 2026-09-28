// Where the view finds old-game art. Shared by the browser code and tools/build-site.ts, so the
// deployed site carries exactly the files the game asks for. No DOM here.
import { ACT_ART } from '../data/act-art.ts';
import { ITEM_BASES, itemBase } from '../data/item-bases.ts';
import type { CurrencyKey } from '../core/types.ts';

/** Set by the site build (esbuild define); undefined in development. */
declare const __OLD_ASSETS__: string | undefined;

/** Prefix of old-game art: "../assets/" while developing from next/, "assets/" on the built site. */
export const OLD_ASSETS = typeof __OLD_ASSETS__ === 'string' ? __OLD_ASSETS__ : '../assets/';

const BOSS_FILES = ['Act1', 'Act2', 'Act3', 'Act4-1', 'Act5', 'Act6', 'Act7', 'Act8-1', 'Act9', 'Act10(1)'];
const CURRENCY_FILES: Partial<Record<CurrencyKey, string>> = {
  magicBud: 'magic-bud', sapBud: 'sap-bud', formlessDew: 'formless-dew', goldenRule: 'golden-rule', blightSpore: 'blight-spore'
};
export const NORMAL_SHEETS = ['root-spider', 'wood-slimes', 'sap-leeches'] as const;

/** Paths below OLD_ASSETS. */
export const artPath = {
  normal: (sheet: (typeof NORMAL_SHEETS)[number]) => `enemies/wood/${sheet}.png`,
  puppetFrame: (i: number) => `enemies/wood/wood-puppet/frame_00${i}.png`,
  boss: (act: number) => `boss/${BOSS_FILES[act - 1] ?? 'Act1'}.png`,
  currency: (key: CurrencyKey): string | null => (CURRENCY_FILES[key] ? `ui/currency/${CURRENCY_FILES[key]}.png` : null),
  item: (baseId: string) => `items/illustrated/${itemBase(baseId).icon}.webp`
};

/** Every old-game file the scripts can request, for the site build to copy. */
export function oldArtFiles(): string[] {
  const files = new Set<string>();
  for (const profile of Object.values(ACT_ART)) for (const path of [profile.material, profile.props]) files.add(path.replace(/^assets\//, ''));
  for (const sheet of NORMAL_SHEETS) files.add(artPath.normal(sheet));
  for (let i = 0; i < 9; i++) files.add(artPath.puppetFrame(i));
  for (let act = 1; act <= BOSS_FILES.length; act++) files.add(artPath.boss(act));
  for (const key of Object.keys(CURRENCY_FILES) as CurrencyKey[]) files.add(artPath.currency(key)!);
  for (const base of ITEM_BASES) files.add(artPath.item(base.id));
  return [...files].sort();
}
