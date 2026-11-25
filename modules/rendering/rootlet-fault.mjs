// Rootlet (Act 1 boss) ground hit: every struck cell's own cracks (the ones its warning showed, js/rendering/danger-tiles.mjs) split
// open with ember light on the soil and cool to dark scars, inside a shockwave ring, under one authored earth burst over the wave
// (rocks thrown up, a dust ring; assets/effects/enemy-earth-contact-v1.webp) at a whole-number scale, with the flash, debris, sparks,
// dust and embers of js/rendering/rootlet-burst.mjs. The heavier second wave: the sheet twice as big, a wider split, more of
// everything. Paint only.
import { cellRandom, dangerTileDot, paintFootGlow, paintTileScar, paintTileStrike } from './danger-tiles.mjs';
import { paintRootletFlash, paintRootletRing } from './rootlet-burst.mjs';

export { paintRootletParticles } from './rootlet-burst.mjs';

/** Visual ms the contact art plays (the impact effect itself lives 560 ms) and the scars stay. */
export const ROOTLET_CONTACT_MS = 540;
export const ROOTLET_SCAR_MS = 1700;
// Earth burst frames [sheet frame, from ms]; the strike's own light covers the sheet's spark frames. 128 px cells, ground at y 80.
const BURST = /* @__PURE__ */ Object.freeze([[2, 0], [3, 90], [4, 200], [5, 320]]);
// The heavier second wave opens on the rocks-and-dust frame; the first keeps the glowing burst frame before it.
const OUTER_BURST = /* @__PURE__ */ Object.freeze([[3, 0], [4, 150], [5, 300]]);
const BURST_MS = 440;
// The dust the slamming paw throws up [sheet frame, from ms], and where the front paws stand: art dots ahead of the feet anchor, the
// lunge at contact included (js/rendering/actor-cast-acting.mjs).
const STOMP = /* @__PURE__ */ Object.freeze([[4, 0], [5, 160]]);
const STOMP_MS = 320;
const ROOTLET_PAW = 118;
// Its front and hind paws in art dots ahead of the feet anchor while it braces, and the lunge that carries them forward at contact.
const ROOTLET_PAWS = /* @__PURE__ */ Object.freeze([85, -40]);
const ROOTLET_LUNGE = 33;

/** Where the Rootlet's front and hind paws stand on screen (lunged forward when its wave lands). */
export function rootletPaws(placed, lunged) {
    const side = placed.west ? -1 : 1, lunge = lunged ? ROOTLET_LUNGE : 0;
    return ROOTLET_PAWS.map(dx => ({ x: placed.x + side * (dx + lunge) * placed.dot, y: placed.y }));
}

/** Under the actors: the struck cells' light on the ground around the hero's feet and the boss's paws standing on them. */
export function paintRootletFootGlow(ctx, footprint, { hero, placed }, look) {
    const feet = [hero, ...(placed ? rootletPaws(placed, true) : [])];
    paintFootGlow(ctx, footprint, feet, { strength: 1 - look.age / (look.outer ? 230 : 180) });
}

/**
 * Inside the struck cells (the caller clips to them, so the safe cells between stay clear): each cell's crack opens and cools.
 * @param {{age:number, outer:boolean, reduced:boolean}} look age in visual ms since contact; outer: the second, heavier wave
 */
export function paintRootletContact(ctx, footprint, look) {
    paintRootletRing(ctx, footprint, look);
    if (look.age >= 380) return;
    paintTileStrike(ctx, footprint, { age: look.age, heavy: look.outer, reduced: look.reduced });
}

function burstFrame(age, outer) {
    if (age < 0 || age >= BURST_MS) return null;
    const frames = outer ? OUTER_BURST : BURST;
    return frames.reduce((found, row) => (age >= row[1] ? row : found), frames[0])[0];
}

/**
 * Outside the cell clip: the flash on the soil, then one earth burst centred on the wave, its dust ring reaching the struck cells.
 * @param {HTMLImageElement|null} image the earth contact sheet (3 x 2 frames of 128 px; ring centre at 64, 76)
 */
export function paintRootletDebris(ctx, footprint, look, image) {
    paintRootletFlash(ctx, footprint, look);
    const frame = image && burstFrame(look.age, look.outer);
    if (frame === null || !image) return;
    // One whole-number size per tile size, twice that on the heavier second wave.
    const scale = Math.max(1, Math.round(footprint.tileW / 48)) * (look.outer ? 2 : 1), size = 128 * scale;
    const { x, y } = footprint.centerPoint;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(image, (frame % 3) * 128, Math.floor(frame / 3) * 128, 128, 128, Math.round(x - 64 * scale), Math.round(y - 76 * scale), size, size);
    ctx.restore();
}

/**
 * Under the boss: its paw cracks the ground as the wave lands (the same opening crack as the struck cells, heavier on the second
 * wave) and throws up a little dust from the earth sheet at one size.
 * @param {{placed:{x:number,y:number,dot:number,west:boolean}, footprint:{tileW:number,tileH:number}, wave:number}} at where the boss
 * was drawn, the struck wave's footprint and its number
 */
export function paintRootletStomp(ctx, at, look, image) {
    const { placed, footprint, wave } = at;
    if (look.age >= 380) return;
    const x = Math.round(placed.x + (placed.west ? -1 : 1) * ROOTLET_PAW * placed.dot), y = Math.round(placed.y);
    const paw = { tileW: footprint.tileW, tileH: footprint.tileH, points: [{ gx: 97, gy: 3 + (wave || 0), x, y }] };
    paintTileStrike(ctx, paw, { age: look.age, heavy: look.outer, reduced: look.reduced });
    const frame = image && look.age < STOMP_MS ? STOMP.reduce((found, row) => (look.age >= row[1] ? row : found), STOMP[0])[0] : null;
    if (frame === null) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(image, (frame % 3) * 128, Math.floor(frame / 3) * 128, 128, 128, x - 64, y - 76, 128, 128);
    ctx.restore();
}

function scarSpecks(ctx, footprint, p) {
    ctx.fillStyle = '#2b1a1a';
    ctx.beginPath();
    for (const { x, y, gx, gy } of footprint.points) {
        const random = cellRandom(gx, gy, 31);
        for (let i = 0; i < 7; i++) {
            const sx = Math.round((random() - 0.5) * footprint.tileW * 0.8 / p) * p, sy = Math.round((random() - 0.5) * footprint.tileH * 0.7 / p) * p;
            ctx.rect(Math.round(x + sx), Math.round(y + sy), p, p);
        }
    }
    ctx.fill();
}

/** The lasting scar after the hit: the dark crack and a few scorched specks, fading out by ROOTLET_SCAR_MS. */
export function paintRootletScar(ctx, footprint, age) {
    if (age < 380 || age >= ROOTLET_SCAR_MS) return;
    const p = dangerTileDot(footprint);
    ctx.save();
    ctx.globalAlpha = age < 1000 ? 0.32 : 0.32 * (1 - (age - 1000) / (ROOTLET_SCAR_MS - 1000));
    scarSpecks(ctx, footprint, p);
    paintTileScar(ctx, footprint);
    ctx.restore();
}
