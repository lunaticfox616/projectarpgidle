// Terrain props drawn in code. Round, organic props (trees, bushes, rocks) are grown from a seed:
// unions of discs shaded by a top-left light with ordered dithering and a dark outline. Small,
// crafted shapes (stump, mushroom, flower, crystal, pillar) are pixel grids tinted per biome.
import { blankCanvas as canvasOf, hash, outlined, paintBlob, sprite, type Disc, type Sprite } from './pixel.ts';
import type { Look, PropKind } from './look.ts';

const OUTLINE = '#0b0806';
const BARK = ['#2a1a10', '#44301e', '#5e452c', '#7a5c3a'];

function tree(seed: number, leaves: string[], dead = false): Sprite {
  const w = 28, h = 34, [c, ctx] = canvasOf(w, h), r = (i: number) => hash(i, seed, 11);
  // Trunk and roots.
  const trunk = (x: number, y: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1); };
  for (let y = 14; y < h - 2; y++) {
    const half = y > h - 7 ? 2 + Math.floor((y - (h - 7)) * 0.9) : 2;
    for (let x = 14 - half; x < 14 + half; x++) trunk(x, y, BARK[x < 13 ? 1 : x < 15 ? 2 : 0]!);
  }
  for (let x = 12; x < 16; x++) trunk(x, h - 2, BARK[0]!);
  if (dead) {
    ctx.strokeStyle = BARK[1]!;
    ctx.lineWidth = 1;
    for (const [x0, y0, x1, y1] of [[14, 16, 5, 6], [14, 13, 22, 3], [13, 20, 4, 15], [15, 19, 24, 12], [8, 10, 7, 4]]) {
      ctx.beginPath();
      ctx.moveTo(x0! + 0.5, y0! + 0.5);
      ctx.lineTo(x1! + 0.5, y1! + 0.5);
      ctx.stroke();
    }
  } else {
    const discs: Disc[] = [[14, 10, 8.5], [8 + r(1) * 2, 13, 6], [20 - r(2) * 2, 13, 6], [10, 6, 5.5], [18, 6, 5.5], [14, 16 + r(3), 5]];
    paintBlob(ctx, discs, leaves, 22, seed);
  }
  return outlined({ width: w, height: h, canvas: c }, OUTLINE, `tree:${seed}:${leaves.join()}:${dead}`);
}

function bush(seed: number, leaves: string[]): Sprite {
  const w = 16, h = 11, [c, ctx] = canvasOf(w, h), r = (i: number) => hash(i, seed, 7);
  paintBlob(ctx, [[5, 6.5, 4.5 + r(1)], [10.5, 6, 5], [8, 3.5, 3.5 + r(2)]], leaves, h, seed);
  return outlined({ width: w, height: h, canvas: c }, OUTLINE, `bush:${seed}:${leaves.join()}`);
}

function rock(seed: number, stone: string[], moss?: string): Sprite {
  const w = 13, h = 9, [c, ctx] = canvasOf(w, h), r = (i: number) => hash(i, seed, 5);
  paintBlob(ctx, [[5, 5, 4 + r(1)], [8.5, 5.5, 3.5 + r(2)], [6.5, 3.5, 3]], stone, h, seed);
  if (moss) {
    ctx.fillStyle = moss;
    for (let x = 3; x < 10; x++) if (hash(x, 1, seed) < 0.55) ctx.fillRect(x, 1 + Math.floor(hash(x, 2, seed) * 2), 1, 1);
  }
  return outlined({ width: w, height: h, canvas: c }, OUTLINE, `rock:${seed}:${stone.join()}:${moss}`);
}

const STUMP = `
  ..bbbbbbb..
  .bddcdcddb.
  .bdcddddcb.
  .abddcdda..
  .aaabbbaa..
  .aabaabba..
  aaabaababa.
  aa.aa.a.aa.`;

const MUSHROOM = `
  ...ccc....
  ..cCCcc...
  .cCccccc..
  .ccccccc.c
  ...ss..cCc
  ...ss..ccc
  ..sss...s.
  .sssss.ss.`;

const FLOWER = `
  .c.c.
  ccCcc
  .cgc.
  ..g..
  .gg..`;

const CRYSTAL = `
  ...C...
  ..CCc..
  ..CCc..
  .CCCcc.
  .CCccc.
  .CCccc.
  CCCcccc
  .Ccccc.
  .ddddd.`;

const PILLAR = `
  .dcccccd.
  dcCCCCccd
  .dcccccd.
  ..dCcCd..
  ..dCccd..
  ..dCcCd..
  ..dCccd..
  ..d.ccd..
  ..dCc.d..
  ..dCccd..
  ..dCcCd..
  ..dCccd..
  .dcCCccd.
  dcccccccd`;

/** One prop sprite for a biome; `seed` varies shapes of grown props. */
export function propSprite(kind: PropKind, look: Look, seed: number): Sprite {
  const leaves = look.leaves ?? look.wallTop;
  const key = (grid: string, pal: Record<string, string>, name: string) => outlined(sprite(grid, pal, `${name}:${JSON.stringify(pal)}`), OUTLINE, `o:${name}:${JSON.stringify(pal)}`);
  switch (kind) {
    case 'tree': return tree(seed % 5, leaves);
    case 'deadTree': return tree(seed % 3, leaves, true);
    case 'bush': return bush(seed % 5, leaves);
    case 'rock': return rock(seed % 5, look.paving, look.leaves ? leaves[2] : undefined);
    case 'stump': return key(STUMP, { a: BARK[0]!, b: BARK[1]!, c: BARK[3]!, d: BARK[2]! }, 'stump');
    case 'mushroom': return key(MUSHROOM, { c: look.accent[1]!, C: look.accent[0]!, s: '#d8cdb4' }, 'mushroom');
    case 'flower': return key(FLOWER, { c: look.accent[seed % 2]!, C: look.accent[(seed + 1) % 2]!, g: leaves[2]! }, 'flower');
    case 'crystal': return key(CRYSTAL, { C: look.accent[1]!, c: look.accent[0]!, d: look.paving[0]! }, 'crystal');
    case 'pillar': return key(PILLAR, { C: look.paving[2]!, c: look.paving[1]!, d: look.paving[0]! }, 'pillar');
  }
}
