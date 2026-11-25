// Rootlet (Act 1 boss) ground hit: a short hot glow on every struck cell and glowing cracks that cool to dark scars, drawn in whole
// dots, under one authored earth burst over the wave (rocks thrown up, a dust ring; assets/effects/enemy-earth-contact-v1.webp) at a
// whole-number scale: the first wave at one size, the heavier second wave twice as big. Paint only.
import { dangerTileDot } from './danger-tiles.mjs';

/** Visual ms the contact art plays (the impact effect itself lives 560 ms) and the scars stay. */
export const ROOTLET_CONTACT_MS = 540;
export const ROOTLET_SCAR_MS = 1700;
const DARK = '#1d1013';
const FLASH = /* @__PURE__ */ Object.freeze(['#d8401e', '#ff8a3a', '#ffe08a']);
const cracks = new Map();
// Earth burst frames [sheet frame, from ms]; the flash covers the sheet's own spark frames. 128 px cells, ground at y 80.
const BURST = /* @__PURE__ */ Object.freeze([[2, 0], [3, 90], [4, 200], [5, 320]]);
// The heavier second wave opens on the rocks-and-dust frame; the first keeps the glowing burst frame before it.
const OUTER_BURST = /* @__PURE__ */ Object.freeze([[3, 0], [4, 150], [5, 300]]);
const BURST_MS = 440;

function rng(gx, gy) {
    let state = (Math.imul(gx, 73856093) ^ Math.imul(gy, 19349663)) >>> 0 || 1;
    return () => {
        state ^= state << 13; state >>>= 0;
        state ^= state >>> 17;
        state ^= state << 5; state >>>= 0;
        return state / 4294967296;
    };
}

function walkBranch(dots, random, { x, y, dx, steps, half }) {
    for (let i = 0; i < steps; i++) {
        x += dx;
        if (random() < 0.42) y += random() < 0.5 ? -1 : 1;
        y = Math.max(-half.rows, Math.min(half.rows, y));
        if (Math.abs(x) > half.cols) return;
        dots.add(`${x}:${y}`);
        if (random() < 0.16) dots.add(`${x}:${y + (random() < 0.5 ? -1 : 1)}`);
    }
}

/** A jagged crack through the cell in dot units from its middle, the same every time for this cell and dot size. */
function crackDots(point, cols, rows) {
    const key = `${point.gx}:${point.gy}:${cols}:${rows}`;
    if (cracks.has(key)) return cracks.get(key);
    const random = rng(point.gx + 101, point.gy + 7), dots = new Set(['0:0']);
    const half = { cols: Math.floor(cols / 2) - 2, rows: Math.floor(rows / 2) - 2 };
    walkBranch(dots, random, { x: 0, y: 0, dx: -1, steps: Math.round(cols * 0.42), half });
    walkBranch(dots, random, { x: 0, y: 0, dx: 1, steps: Math.round(cols * 0.42), half });
    walkBranch(dots, random, { x: 0, y: random() < 0.5 ? -1 : 1, dx: random() < 0.5 ? -1 : 1, steps: Math.round(cols * 0.22), half });
    const list = [...dots].map(text => text.split(':').map(Number));
    cracks.set(key, list);
    return list;
}

function paintDots(ctx, dots, { cx, cy, p }, grow) {
    ctx.beginPath();
    for (const [x, y] of dots) ctx.rect(cx + x * p - grow, cy + y * p - grow, p + 2 * grow, p + 2 * grow);
    ctx.fill();
}

function seamColour(age) {
    if (age < 70) return '#ffa448';
    if (age < 170) return '#f57a34';
    if (age < 300) return '#a83e22';
    return null;
}

/** Cracks on every struck cell: dark lines whose middle glows hot and cools; afterwards the scar alone. */
function paintCracks(ctx, footprint, age) {
    const p = dangerTileDot(footprint), cols = Math.floor(footprint.tileW / p), rows = Math.floor(footprint.tileH / p);
    const seam = seamColour(age);
    for (const point of footprint.points) {
        const dots = crackDots(point, cols, rows), at = { cx: Math.round(point.x - p / 2), cy: Math.round(point.y - p / 2), p };
        ctx.fillStyle = DARK;
        paintDots(ctx, dots, at, seam ? 1 : 0);
        if (!seam) continue;
        ctx.fillStyle = seam;
        paintDots(ctx, dots, at, 0);
    }
}

/** One stepped oval of glow in whole dots (cut by the cell clip, so the struck cell's corners keep their soil). */
function glowOval(ctx, { cx, cy, rx, ry }, p) {
    const rows = Math.max(1, Math.round(ry / p));
    ctx.beginPath();
    for (let r = -rows; r <= rows; r++) {
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (r / (rows + 0.5)) ** 2)) / p) * p;
        ctx.rect(cx - half, cy + r * p, 2 * half, p);
    }
    ctx.fill();
}

function paintFlashCell(ctx, point, { p, heat, outer, tileW, tileH }) {
    const swell = outer ? 1.18 : 1, cx = Math.round(point.x / p) * p, cy = Math.round(point.y / p) * p;
    FLASH.forEach((colour, band) => {
        const scale = [0.6, 0.4, 0.2][band] * swell * (band ? 0.55 + 0.45 * heat : 1);
        ctx.fillStyle = colour;
        glowOval(ctx, { cx, cy, rx: tileW * scale, ry: tileH * scale * 1.05 }, p);
    });
}

/** The hot flash: full for the first frames, then the bands shrink to the middle and go. */
function paintFlash(ctx, footprint, { age, outer, reduced }) {
    const span = outer ? 150 : 170;
    if (age >= span) return;
    const heat = 1 - age / span, p = dangerTileDot(footprint);
    ctx.globalAlpha = reduced ? Math.min(0.8, heat + 0.2) : Math.min(1, heat * 1.6);
    for (const point of footprint.points) paintFlashCell(ctx, point, { p, heat, outer, tileW: footprint.tileW, tileH: footprint.tileH });
    ctx.globalAlpha = 1;
}

/**
 * Inside the struck cells (the caller clips to them, so the safe cells between stay clear): hot glow and glowing cracks.
 * @param {{age:number, outer:boolean, reduced:boolean}} look age in visual ms since contact; outer: the second, heavier wave
 */
export function paintRootletContact(ctx, footprint, look) {
    ctx.save();
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    paintFlash(ctx, footprint, look);
    if (look.age < 300) paintCracks(ctx, footprint, look.age);
    ctx.restore();
}

function burstFrame(age, outer) {
    if (age < 0 || age >= BURST_MS) return null;
    const frames = outer ? OUTER_BURST : BURST;
    return frames.reduce((found, row) => (age >= row[1] ? row : found), frames[0])[0];
}

/**
 * Outside the cell clip: one earth burst centred on the wave, its dust ring reaching the struck cells.
 * @param {HTMLImageElement|null} image the earth contact sheet (3 x 2 frames of 128 px; ring centre at 64, 76)
 */
export function paintRootletDebris(ctx, footprint, look, image) {
    const frame = image && burstFrame(look.age, look.outer);
    if (frame === null || !image) return;
    const scale = Math.max(1, Math.round(footprint.width * (look.outer ? 0.85 : 0.7) / 120)), size = 128 * scale;
    const { x, y } = footprint.centerPoint;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(image, (frame % 3) * 128, Math.floor(frame / 3) * 128, 128, 128, Math.round(x - 64 * scale), Math.round(y - 76 * scale), size, size);
    ctx.restore();
}

function scarSpecks(ctx, footprint, p) {
    ctx.fillStyle = '#2b1a1a';
    ctx.beginPath();
    for (const { x, y, gx, gy } of footprint.points) {
        const random = rng(gx + 31, gy + 17);
        for (let i = 0; i < 7; i++) {
            const sx = Math.round((random() - 0.5) * footprint.tileW * 0.8 / p) * p, sy = Math.round((random() - 0.5) * footprint.tileH * 0.7 / p) * p;
            ctx.rect(Math.round(x + sx), Math.round(y + sy), p, p);
        }
    }
    ctx.fill();
}

/** The lasting scar after the hit: the dark crack and a few scorched specks, fading out by ROOTLET_SCAR_MS. */
export function paintRootletScar(ctx, footprint, age) {
    if (age < 250 || age >= ROOTLET_SCAR_MS) return;
    const p = dangerTileDot(footprint);
    ctx.save();
    ctx.globalAlpha = age < 1000 ? 0.6 : 0.6 * (1 - (age - 1000) / (ROOTLET_SCAR_MS - 1000));
    scarSpecks(ctx, footprint, p);
    paintCracks(ctx, footprint, 9999);
    ctx.restore();
}
