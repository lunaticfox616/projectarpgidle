// The Act 9 chorus seed's aimed cell and its burst, drawn in whole dots. Lilac marks the chaos caster's cast (corners closing on the
// aimed cell, the seed's trail); the cell itself carries the shared warm danger tile (js/rendering/danger-tiles.mjs). On contact the
// cell splashes, a ring runs out and short shards jump up, all inside the cell's own width. Paint only.

const INK = '#22102c';
const LILAC = '#f3d6ff';
const VIOLET = '#b45cf2';
const DEEP = '#5a2479';
const WHITE = '#fff6ff';
// [x across the cell, reach in tiles, delay ms]
// Chaos contact frames [sheet frame, from ms] (assets/effects/enemy-chaos-contact-v1.webp: 3 x 2 frames of 128 x 64, ground at y 57).
const CRYSTALS = /* @__PURE__ */ Object.freeze([[1, 0], [2, 30], [3, 95], [4, 145], [5, 185]]);
const SHARDS = /* @__PURE__ */ Object.freeze([[-0.36, 1.7, 0], [0.02, 2.2, 10], [0.36, 1.8, 20]]);
// An eight-point star, in dots from its middle: # ink, V violet, L lilac, W white.
const STAR = /* @__PURE__ */ Object.freeze([
    '      #      ',
    '  #  #W#  #  ',
    '  #V#LWL#V#  ',
    '   #VLWLV#   ',
    ' ##LLWWWLL## ',
    '#WWWWWWWWWWW#',
    ' ##LLWWWLL## ',
    '   #VLWLV#   ',
    '  #V#LWL#V#  ',
    '  #  #W#  #  ',
    '      #      '
]);
const STAR_TONES = /* @__PURE__ */ Object.freeze({ '#': '#22102c', V: '#b45cf2', L: '#f3d6ff', W: '#fff6ff' });

/** One dot of these marks at the current tile size. */
export function chorusDot(footprint) {
    return Math.max(2, Math.round(footprint.tileH / 13));
}

function inkedRect(ctx, [x, y, w, h], colour) {
    ctx.fillStyle = INK;
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = colour;
    ctx.fillRect(x, y, w, h);
}

/**
 * Four lilac corners that close on the aimed cell from outside as the shot nears (fixed on the cell with reduced motion).
 * @param {number} progress 0 when the caster starts its wind-up → 1 at contact
 */
export function paintChorusCorners(ctx, footprint, progress, reduced) {
    const p = chorusDot(footprint), arm = 4 * p;
    const gap = reduced ? p : Math.round((1 - progress) * 6) * p + p;
    const left = Math.round(footprint.x - footprint.tileW / 2) - gap, right = Math.round(footprint.x + footprint.tileW / 2) + gap;
    const top = Math.round(footprint.y - footprint.tileH / 2) - gap, bottom = Math.round(footprint.y + footprint.tileH / 2) + gap;
    ctx.save();
    ctx.globalAlpha = 1;
    for (const [x, y, sx, sy] of [[left, top, 1, 1], [right, top, -1, 1], [left, bottom, 1, -1], [right, bottom, -1, -1]]) {
        const ox = sx > 0 ? x : x - p, oy = sy > 0 ? y : y - p;
        inkedRect(ctx, [sx > 0 ? ox : ox - arm + p, oy, arm, p], LILAC);
        inkedRect(ctx, [ox, sy > 0 ? oy : oy - arm + p, p, arm], LILAC);
        ctx.fillStyle = LILAC;
        ctx.fillRect(sx > 0 ? ox : ox - arm + p, oy, arm, p);
    }
    ctx.restore();
}

/** A dark violet splash pressed into the cell: ink rim, deep fill dithered with violet. */
function paintCrater(ctx, { cx, cy, rx, ry }, p) {
    const rows = Math.max(1, Math.round(ry / p));
    for (let r = -rows; r <= rows; r++) {
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (r / (rows + 0.5)) ** 2)) / p);
        const y = Math.round(cy / p) * p + r * p, left = Math.round(cx / p) * p - half * p;
        ctx.fillStyle = INK;
        ctx.fillRect(left - p, y, (2 * half + 2) * p, p);
        for (let c = -half + 1; c < half; c++) {
            ctx.fillStyle = (c + r) % 2 ? DEEP : VIOLET;
            ctx.fillRect(Math.round(cx / p) * p + c * p, y, p, p);
        }
    }
}

function ringDots(ctx, { cx, cy, rx, ry }, p) {
    const steps = Math.max(12, Math.round((rx + ry) * 2.2 / p));
    ctx.beginPath();
    for (let i = 0; i < steps; i++) {
        const a = i / steps * Math.PI * 2;
        ctx.rect(Math.round((cx + Math.cos(a) * rx) / p) * p, Math.round((cy + Math.sin(a) * ry) / p) * p, p, p);
    }
    ctx.fill();
}

/** Under the actors: the cell splashes dark violet and a lilac ring runs out to the cell's edges. */
export function paintChorusSplash(ctx, footprint, age, reduced) {
    const p = chorusDot(footprint), u = Math.min(1, age / 200), { x, y, tileW, tileH } = footprint;
    const cx = Math.round(x), cy = Math.round(y + tileH * 0.1);
    ctx.save();
    ctx.globalAlpha = 1;
    paintCrater(ctx, { cx, cy, rx: tileW * 0.34, ry: tileH * 0.3 }, p);
    const grow = reduced ? 0.46 : 0.22 + 0.28 * Math.sqrt(u);
    const ring = { cx, cy, rx: tileW * grow, ry: tileH * grow * 0.95 };
    ctx.globalAlpha = Math.min(1, 1.6 * (1 - u));
    ctx.fillStyle = INK;
    ringDots(ctx, { ...ring, rx: ring.rx + p, ry: ring.ry + p }, p);
    ringDots(ctx, { ...ring, rx: ring.rx - p, ry: ring.ry - p }, p);
    ctx.fillStyle = age < 60 ? WHITE : LILAC;
    ringDots(ctx, ring, p);
    ctx.restore();
}

function paintFlash(ctx, { cx, cy, p }, age) {
    if (age >= 90) return;
    const q = age < 45 ? p + 1 : p, half = Math.floor(STAR[0].length / 2);
    for (const [symbol, colour] of Object.entries(STAR_TONES)) {
        ctx.fillStyle = age >= 60 && symbol === 'W' ? STAR_TONES.L : colour;
        ctx.beginPath();
        STAR.forEach((row, dy) => {
            for (let dx = 0; dx < row.length; dx++) if (row[dx] === symbol) ctx.rect(cx + (dx - half) * q, cy + (dy - 5) * q, q, q);
        });
        ctx.fill();
    }
}

/** @param {readonly number[]} shard [x across the cell, reach in tiles, delay ms] */
function paintShard(ctx, { cx, cy, p, tileW, tileH }, shard, age) {
    const [dx, reach, delay] = shard;
    const u = (age - delay) / 185;
    if (u < 0 || u >= 1) return;
    const length = Math.max(2, Math.round((1 - u) * 7)) * p, width = u < 0.55 ? 2 * p : p;
    const x = Math.round((cx + dx * tileW) / p) * p, top = Math.round((cy - tileH * (0.2 + reach * Math.sqrt(u))) / p) * p;
    inkedRect(ctx, [x, top, width, length], VIOLET);
    ctx.fillStyle = u < 0.5 ? WHITE : LILAC;
    ctx.fillRect(x, top, width, 2 * p);
}

function paintCrystals(ctx, footprint, age, image) {
    const frame = CRYSTALS.reduce((found, row) => (age >= row[1] ? row : found), CRYSTALS[0])[0];
    const scale = Math.max(1, Math.round(footprint.tileW * 1.6 / 115)), w = 128 * scale, h = 64 * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, (frame % 3) * 128, Math.floor(frame / 3) * 64, 128, 64,
        Math.round(footprint.x - w / 2), Math.round(footprint.y + footprint.tileH * 0.22 - 57 * scale), w, h);
}

/**
 * Over the actors: violet crystals burst out of the cell (the authored sheet when it has loaded), a short white-lilac flash on
 * top and a few shards jumping up.
 * @param {{reduced:boolean, image:HTMLImageElement|null}} look image: the chaos contact sheet
 */
export function paintChorusBurst(ctx, footprint, age, look) {
    const { reduced, image } = look;
    const p = chorusDot(footprint), { x, y, tileW, tileH } = footprint;
    const at = { cx: Math.round(x / p) * p, cy: Math.round((y + tileH * 0.05) / p) * p, p, tileW, tileH };
    ctx.save();
    ctx.globalAlpha = 1;
    if (image) paintCrystals(ctx, footprint, age, image);
    paintFlash(ctx, at, age);
    if (!reduced) for (const shard of SHARDS) paintShard(ctx, at, shard, age);
    ctx.restore();
}

/**
 * Dots along the seed's path, newest first: white, then lilac, then small violet; `fade` dims the whole path (after the landing).
 * @param {Array<{x:number,y:number}>} points
 */
export function paintChorusPath(ctx, points, { p, fade }) {
    ctx.save();
    points.forEach((point, index) => {
        const older = index / Math.max(1, points.length);
        const size = older < 0.25 ? 2 * p : older < 0.6 ? p + 1 : p;
        ctx.globalAlpha = fade * (older < 0.6 ? 1 : 1.6 - older);
        inkedRect(ctx, [Math.round(point.x - size / 2), Math.round(point.y - size / 2), size, size], older < 0.25 ? WHITE : older < 0.6 ? LILAC : VIOLET);
    });
    ctx.restore();
}

/** A violet circle on the floor under the casting bulb, with four bright marks, from its wind-up until just after its seed lands. */
export function paintChorusCasterRing(ctx, footprint, strength) {
    const p = chorusDot(footprint), { x, y, tileW, tileH } = footprint;
    const ring = { cx: Math.round(x), cy: Math.round(y), rx: tileW * 0.5, ry: tileH * 0.46 };
    ctx.save();
    ctx.globalAlpha = 0.85 * strength;
    paintCrater(ctx, { ...ring, rx: ring.rx - p, ry: ring.ry - p }, p);
    ctx.globalAlpha = strength;
    ctx.fillStyle = INK;
    ringDots(ctx, { ...ring, rx: ring.rx + p, ry: ring.ry + p }, p);
    ringDots(ctx, { ...ring, rx: ring.rx - p, ry: ring.ry - p }, p);
    ctx.fillStyle = LILAC;
    ringDots(ctx, ring, p);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        inkedRect(ctx, [Math.round((ring.cx + dx * ring.rx) / p) * p - p / 2, Math.round((ring.cy + dy * ring.ry) / p) * p - p / 2, 2 * p, 2 * p], WHITE);
    }
    ctx.restore();
}

/** A hit on the standing hero: a short violet spark at body height over the burst (no spark on a dodge). */
export function paintChorusHit(ctx, footprint, age) {
    if (age >= 110) return;
    const p = chorusDot(footprint), cx = Math.round(footprint.x / p) * p, cy = Math.round((footprint.y - footprint.tileH * 1.5) / p) * p;
    const reach = (age < 50 ? 4 : 3) * p;
    ctx.save();
    for (const [dx, dy] of [[1, 1], [1, -1]]) {
        for (let i = -reach; i <= reach; i += p) inkedRect(ctx, [cx + i * dx, cy + i * dy, p, p], age < 50 ? WHITE : LILAC);
    }
    ctx.restore();
}
