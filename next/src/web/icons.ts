// Item and currency icons drawn in code. Items are pixel grids per kind, recoloured by the base's
// tier (rust → iron → gilded → obsidian); currencies are small shaded blobs. HUD markup uses them as
// data URLs (our own canvases, so this also works from file://).
import { itemBase } from '../data/item-bases.ts';
import { blankCanvas, dot, parseGrid, line, outlined, paintBlob, sprite, spriteUrl, type Sprite } from './pixel.ts';
import type { CurrencyKey } from '../core/types.ts';

const OUTLINE = '#0b0806';

/** Symmetric shapes are written as their left half and mirrored. */
function mirror(half: string): string {
  const rows = parseGrid(half), width = Math.max(...rows.map(r => r.length));
  return rows.map(r => r.padEnd(width, '.')).map(r => r + [...r].reverse().join('')).join('\n');
}

const SWORD = `
  ....d....
  ...dcb...
  ...dcb...
  ...dcb...
  ...dcb...
  ...dcb...
  ...dcb...
  ...dcb...
  ...dcb...
  ...dcb...
  ...dcb...
  ...dcb...
  ...dcb...
  ..adcba..
  abbcHcbba
  .aaaaaaa.
  ...eff...
  ...egf...
  ...eff...
  ...egf...
  ...eff...
  ..ahHha..
  ...aha...`;

const STAFF = `
  ...hhh...
  ..hHHHh..
  .hHdHHHh.
  .hHHHHHh.
  .hhHHHhh.
  ..ahhha..
  ..c.f.c..
  ...cfc...
  ....f....
  ....e....
  ....f....
  ....e....
  ....f....
  ....e....
  ...bfb...
  ....e....
  ....f....
  ....e....
  ....f....
  ....e....
  ....f....
  ...aba...`;

const BUCKLER = mirror(`
  .....aaa
  ...aabbb
  ..abcccc
  .abcceee
  .abceffe
  abceffgg
  abcefggh
  abcefghH
  abcefggh
  abceffgg
  .abceffe
  .abcceee
  ..abcccc
  ...aabbb
  .....aaa`);

const WARD = mirror(`
  ......h
  .....hH
  ....hHH
  ...hHHd
  ..hHHHd
  ..hHHHH
  ..hhHHH
  ...hhHH
  ....hhH
  ..aabbh
  .abcccc
  ..aabbb`);

const HELMET = mirror(`
  ....aaaa
  ..aabbcc
  .abbccdd
  .abccddd
  abbcccdd
  abbccccc
  aHHhaaaa
  abbaeeee
  abbae...
  abba....
  abba....
  .aba....
  ..aa....`);

const ARMOR = mirror(`
  ..aab...
  .abccb..
  abcccbbb
  abcccccc
  abccecce
  abcceecc
  abcceecc
  .abceecc
  .abcceec
  .abccccc
  .aeffffh
  .abccccc
  .abccccc
  .abccccc
  .abcccbb
  .abccbbb
  .aabbbaa
  ..aaaa..`);

const GLOVES = `
  ....ab.ab.......
  ...abcabcab.....
  ...abcabcabcab..
  ...abcabcabcabc.
  ...abcabcabcabc.
  .ab.bccccccccbc.
  abcabccccccccbc.
  abcbccccccccccb.
  .abbcccccccccb..
  ..abccccccccb...
  ...abcccccccb...
  ...aeeeeeeeea...
  ...affffffffa...
  ...aeeeeeeeea...
  ...aaaaaaaaaa...`;

const BOOTS = `
  ....abbbba.....
  ....abccba.....
  ....abccba.....
  ....abccba.....
  ....abccba.....
  ....aeffea.....
  ....abccba.....
  ....abcccbaa...
  ....abcccccbba.
  ...abccccccccba
  ...abccccccccba
  ...aaaaaaaaaaaa`;

const BELT = `
  .aaaaaaaaaaaaaa.
  aeeeeeaddddaeeea
  afffffdhHHhdfffa
  agggggdhhhhdggga
  aeeeeeaddddaeeea
  .aaaaaaaaaaaaaa.`;

const AMULET = mirror(`
  ..a.....
  .a......
  a.......
  a.......
  a.......
  .a......
  ..a.....
  ...a....
  ....aabb
  ...abccd
  ...bchHH
  ...bchHH
  ....bcch
  .....bbb`);

const RING = `
  ......hHHh......
  .....hHHHHh.....
  ......hhhh......
  ....abbccbba....
  ..abbc....cbba..
  .abc........cba.
  .ab..........ba.
  ab............ba
  ab............ba
  ab............ba
  .ab..........ba.
  .abc........cba.
  ..abbc....cbba..
  ....abbccbba....`;

/** Metal ramp (a–d), leather (e–g) and gem (h dark, H light) by base tier. */
const TIERS = [
  { metal: ['#3a2a1e', '#6a4a30', '#8e6a44', '#b08a5c'], leather: ['#3a2414', '#5e3c22', '#86583a'], gem: ['#4a7a2a', '#9ad04a'] },
  { metal: ['#2a2e34', '#4a525c', '#78828c', '#b4bec6'], leather: ['#2e2218', '#4e3a28', '#705640'], gem: ['#2a5aa8', '#7ab8ff'] },
  { metal: ['#4a3818', '#8a6a28', '#c89c40', '#f4dc90'], leather: ['#4a1a1a', '#7a2a24', '#a84436'], gem: ['#a82a3a', '#ff8a8a'] },
  { metal: ['#140e1c', '#2e2240', '#56407a', '#a08ad0'], leather: ['#1a1024', '#2e1e3e', '#4a3260'], gem: ['#b88a1a', '#ffe070'] }
] as const;

function gridFor(kind: string, arcanist: boolean): string {
  switch (kind) {
    case 'weapon': return arcanist ? STAFF : SWORD;
    case 'offhand': return arcanist ? WARD : BUCKLER;
    case 'helmet': return HELMET;
    case 'armor': return ARMOR;
    case 'gloves': return GLOVES;
    case 'boots': return BOOTS;
    case 'belt': return BELT;
    case 'amulet': return AMULET;
    default: return RING;
  }
}

const TIER_LEVELS = [1, 9, 18, 26];

export function itemSprite(baseId: string): Sprite {
  const base = itemBase(baseId), tier = TIERS[Math.max(0, TIER_LEVELS.indexOf(base.minLevel))]!;
  const [a, b, c, d] = tier.metal, [e, f, g] = tier.leather, [h, H] = tier.gem;
  const grid = gridFor(base.kind, !!base.classes?.includes('arcanist'));
  const palette = { a, b, c, d, e, f, g, h, H };
  return outlined(sprite(grid, palette, `item:${base.id}`), OUTLINE, `oitem:${base.id}`);
}

const urls = new Map<string, string>();
const cachedUrl = (key: string, make: () => Sprite): string => {
  let url = urls.get(key);
  if (!url) urls.set(key, (url = spriteUrl(make())));
  return url;
};

export const itemIconUrl = (baseId: string): string => cachedUrl(`item:${baseId}`, () => itemSprite(baseId));

// ── Currencies ───────────────────────────────────────────────────────────────────────────────────

const LEAF = ['#1e3a14', '#2e5a1e', '#4a8a2a', '#7ac04a'];
type Paint = (ctx: CanvasRenderingContext2D) => void;

const bud = (ramp: string[]): Paint => ctx => {
  line(ctx, 6, 11, 6, 7, LEAF[1]!);
  paintBlob(ctx, [[3.5, 8.5, 2.2]], LEAF, 12, 1);
  paintBlob(ctx, [[8.5, 8.5, 2.2]], LEAF, 12, 2);
  paintBlob(ctx, [[6, 5, 3.6], [6, 2.8, 2.2]], ramp, 9, 3);
};

const CURRENCY_PAINT: Record<CurrencyKey, Paint> = {
  magicBud: bud(['#1a2a6a', '#2e4ab0', '#5a80e8', '#a8c8ff']),
  sapBud: bud(['#5a2a08', '#a05a10', '#e09a28', '#ffe08a']),
  formlessDew: ctx => paintBlob(ctx, [[6, 7.5, 4], [6, 4.5, 2.6], [6, 2.4, 1.4]], ['#2a4a5a', '#5a90a8', '#a0d8e8', '#f0ffff'], 12, 4),
  goldenRule: ctx => {
    paintBlob(ctx, [[6, 6, 5.2]], ['#5a3a0a', '#a07018', '#e0b030', '#fff0a0'], 12, 5);
    line(ctx, 4, 4, 4, 8, '#5a3a0a');
    line(ctx, 4, 8, 8, 8, '#5a3a0a');
  },
  blightSpore: ctx => {
    for (const [x, y, r] of [[4, 7, 2.8], [8, 7.5, 2.6], [6, 4, 2.6]] as const) paintBlob(ctx, [[x, y, r]], ['#2a1a34', '#4a2a5a', '#6a8a2a', '#b0e050'], 12, x + y);
  },
  bossCore: ctx => {
    paintBlob(ctx, [[6, 6, 5]], ['#3a0a0a', '#8a1a14', '#e0402a', '#ffb070'], 12, 6);
    dot(ctx, 5, 5, '#fff0c0', 2, 2);
  },
  challengeMark: ctx => {
    paintBlob(ctx, [[6, 6, 5]], ['#1a1030', '#3a2460', '#6a48a8', '#b098f0'], 12, 7);
    line(ctx, 6, 2, 6, 10, '#f0e0ff');
    line(ctx, 3, 5, 9, 5, '#f0e0ff');
  }
};

const currencies = new Map<CurrencyKey, Sprite>();

export function currencySprite(key: CurrencyKey): Sprite {
  let s = currencies.get(key);
  if (!s) {
    const [canvas, ctx] = blankCanvas(12, 12);
    CURRENCY_PAINT[key](ctx);
    currencies.set(key, (s = outlined({ width: 12, height: 12, canvas }, OUTLINE, `coin:${key}`)));
  }
  return s;
}

export const currencyIconUrl = (key: CurrencyKey): string => cachedUrl(`coin:${key}`, () => currencySprite(key));
