// The Act 9 chorus seed's burst, the short trail behind it and the glow under its caster, drawn in whole dots. The aimed cell itself
// heats up and its crack opens in the chaos palette like the Rootlet's cells (js/rendering/danger-tiles.mjs). On contact violet
// crystals jump out of the cell, kept to the cell's own width; when the hero has stepped off the cell they stay below its top edge.
// Paint only.
import { steppedOval } from './danger-tiles.mjs';

const LILAC = '#f3d6ff';
const VIOLET = '#b45cf2';
const DEEP = '#5a2479';
const WHITE = '#fff6ff';
// The caster's floor light: a soft lilac-violet, less saturated than the burst so it reads as light on the stone.
const GLOW = '#9b6ad8';
// Crystal blades [x from the cell middle, height, base width, lean of the tip] in dots, splaying outward inside the cell's half
// width of 13 dots.
const CRYSTALS = /* @__PURE__ */ Object.freeze([[0, 16, 3, -1], [-4, 11, 3, -5], [4, 12, 3, 5], [-8, 6, 2, -4], [9, 5, 2, 3]]);
// On an empty cell they stay below its top edge, so nothing rises toward the hero standing on the next cell.
const LOW_CRYSTALS = /* @__PURE__ */ Object.freeze([[0, 9, 3, -1], [-4, 7, 3, -4], [4, 7, 3, 4], [-8, 4, 2, -3], [9, 4, 2, 2]]);
// Stone chips the burst throws up inside the cell: x across the cell at the end, height of the arc in tiles, colour.
const CHIPS = /* @__PURE__ */ Object.freeze([{ dx: -0.42, lift: 1.1, colour: '#d9cbb4' }, { dx: -0.26, lift: 1.6, colour: '#b8a792' },
    { dx: -0.1, lift: 0.9, colour: '#efe2cc' }, { dx: 0.12, lift: 1.4, colour: '#d9cbb4' }, { dx: 0.28, lift: 1, colour: '#b8a792' },
    { dx: 0.44, lift: 1.5, colour: '#efe2cc' }]);
// [x across the cell, reach in tiles, delay ms]
const SHARDS = /* @__PURE__ */ Object.freeze([[-0.3, 1.7, 0], [0.02, 2.2, 10], [0.3, 1.8, 20]]);
/** One dot of these marks at the current tile size. */
export function chorusDot(footprint) {
    return Math.max(2, Math.round(footprint.tileH / 13));
}

function inkedRect(ctx, [x, y, w, h], colour) {
    ctx.fillStyle = DEEP;
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = colour;
    ctx.fillRect(x, y, w, h);
}

/** The contact flash: lilac light added onto the stone (and the hero over it) around a small white sparkle, no outlined star. */
function paintFlash(ctx, { cx, cy, p, tileW, tileH }, age, small) {
    const span = small ? 70 : 100;
    if (age >= span) return;
    const heat = 1 - age / span, scale = small ? 0.7 : 1, arm = (age < 45 && !small ? 4 : 2) * p;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = VIOLET;
    for (const [reach, alpha] of [[0.5, 0.22], [0.34, 0.28], [0.2, 0.36]]) {
        ctx.globalAlpha = alpha * heat;
        steppedOval(ctx, { cx, cy, rx: tileW * reach * scale, ry: tileH * reach * scale * 1.1 }, p);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, heat * 1.6);
    ctx.fillStyle = age < 45 ? WHITE : LILAC;
    ctx.fillRect(cx - arm, cy, 2 * arm + p, p);
    ctx.fillRect(cx, cy - arm, p, 2 * arm + p);
    ctx.fillRect(cx - p, cy - p, 3 * p, 3 * p);
    ctx.globalAlpha = 1;
}

/** @param {readonly number[]} shard [x across the cell, reach in tiles, delay ms] */
function paintShard(ctx, { cx, cy, p, tileW, tileH }, shard, age) {
    const [dx, reach, delay] = shard;
    const u = (age - delay) / 185;
    if (u < 0 || u >= 1) return;
    const length = Math.max(2, Math.round((1 - u) * 7)) * p, width = u < 0.55 ? 2 * p : p;
    const x = Math.round((cx + dx * tileW) / p) * p, top = Math.round((cy - tileH * (0.2 + reach * Math.sqrt(u))) / p) * p;
    inkedRect(ctx, [x, top, width, length], VIOLET);
    ctx.fillStyle = LILAC;
    ctx.fillRect(x, top, width, 2 * p);
}

/** The crystals' height share at `age`: half grown, full, broken off at the top, stumps; null once they are gone. */
function crystalStage(age) {
    if (age < 35) return { share: 0.5, tip: true, alpha: 1 };
    if (age < 150) return { share: 1, tip: age < 90, alpha: 1 };
    if (age < 190) return { share: 0.6, tip: false, alpha: 1 };
    return age < 220 ? { share: 0.3, tip: false, alpha: 1 - (age - 190) / 30 } : null;
}

/** One crystal's rows from its base up, as [left, right] dot spans around its foot.
 * @param {readonly number[]} shape [x from the cell middle, height, base width, lean of the tip] */
function crystalRows(shape, share) {
    const [dx, height, base, lean] = shape;
    const rows = [], h = Math.max(1, Math.round(height * share));
    for (let r = 0; r < h; r++) {
        const t = r / height, width = Math.max(1, Math.round(base * (1 - t))), left = dx + Math.round(lean * t) - Math.floor(width / 2);
        rows.push([left, left + width - 1]);
    }
    return rows;
}

function crystalPass(ctx, shapes, { cx, cy, p }, { grow, pick }) {
    ctx.beginPath();
    for (const rows of shapes) {
        rows.forEach(([left, right], r) => {
            const span = pick(left, right, r, rows.length);
            if (span) ctx.rect(cx + span[0] * p - grow, cy - (r + 1) * p - grow, (span[1] - span[0] + 1) * p + 2 * grow, p + 2 * grow);
        });
    }
    ctx.fill();
}

/** Violet crystals jumping out of the cell, drawn in whole dots and kept to its width (lower when the cell was empty). */
function paintCrystals(ctx, at, age, empty) {
    const stage = crystalStage(age);
    if (!stage) return;
    const shapes = (empty ? LOW_CRYSTALS : CRYSTALS).map(shape => crystalRows(shape, stage.share));
    ctx.globalAlpha = stage.alpha;
    const passes = [{ colour: DEEP, grow: 1, pick: (l, r) => [l, r] }, { colour: stage.share < 1 ? DEEP : VIOLET, grow: 0, pick: (l, r) => [l, r] },
        { colour: LILAC, grow: 0, pick: (l, r, row, n) => (row < n - 1 ? [l, l] : null) }];
    for (const pass of passes) {
        ctx.fillStyle = pass.colour;
        crystalPass(ctx, shapes, at, pass);
    }
    if (!stage.tip) return;
    ctx.fillStyle = LILAC;
    crystalPass(ctx, shapes, at, { grow: 0, pick: (l, r, row, n) => (row === n - 1 ? [l, r] : null) });
}

/** A column of violet light rising out of the struck cell over the hero, added onto what is drawn (a hit only). */
function paintPillar(ctx, { cx, cy, p, tileW, tileH }, age) {
    if (age >= 200) return;
    const heat = 1 - age / 200;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = VIOLET;
    for (const [w, h, alpha] of [[0.4, 1.9, 0.16], [0.28, 1.7, 0.2], [0.15, 1.5, 0.26]]) {
        ctx.globalAlpha = alpha * heat;
        steppedOval(ctx, { cx, cy: Math.round((cy - tileH * h * 0.75) / p) * p, rx: tileW * w, ry: tileH * h }, p);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
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

/** A ring of light running out over the stone to the cell's edges, and a few stone chips thrown up inside the cell (lower when the
 * cell was empty). */
function paintShock(ctx, { cx, cy, p, tileW, tileH }, age, empty) {
    if (age >= 180) return;
    const u = age / 180, reach = Math.sqrt(u);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.85 * (1 - u);
    ctx.fillStyle = LILAC;
    ringDots(ctx, { cx, cy, rx: tileW * (0.16 + 0.31 * reach), ry: tileH * (0.16 + 0.29 * reach) }, p);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1 - u * 0.6;
    for (const { dx, lift, colour } of CHIPS) {
        const x = Math.round((cx + dx * tileW * (0.15 + 0.85 * u)) / p) * p;
        const y = Math.round((cy - tileH * lift * (empty ? 0.35 : 1) * 4 * u * (1 - u)) / p) * p;
        ctx.fillStyle = DEEP;
        ctx.fillRect(x + 1, y + 1, p, p);
        ctx.fillStyle = colour;
        ctx.fillRect(x, y, p, p);
    }
    ctx.globalAlpha = 1;
}

/** The burst's room: the aimed cell's own columns; above the cell only while the hero stands on it. */
function clipToCell(ctx, { x, y, tileW, tileH }, empty) {
    const left = Math.round(x - tileW / 2), right = Math.round(x + tileW / 2), bottom = Math.round(y + tileH / 2);
    const top = Math.round(empty ? y - tileH / 2 : y - tileH * 3.2);
    ctx.beginPath();
    ctx.rect(left, top, right - left, bottom - top);
    ctx.clip();
}

/**
 * Over the actors: violet crystals burst out of the cell, a short white-lilac flash on top and, on a hit, a few shards jumping up.
 * @param {{reduced:boolean, empty:boolean}} look empty: nobody stood on the cell when the seed landed
 */
export function paintChorusBurst(ctx, footprint, age, look) {
    const { reduced, empty } = look;
    const p = chorusDot(footprint), { x, y, tileW, tileH } = footprint;
    const at = { cx: Math.round(x / p) * p, cy: Math.round((y + tileH * 0.05) / p) * p, p, tileW, tileH };
    ctx.save();
    ctx.globalAlpha = 1;
    clipToCell(ctx, footprint, empty);
    if (!empty) paintPillar(ctx, at, age);
    paintCrystals(ctx, { cx: at.cx, cy: Math.round((y + tileH * 0.3) / p) * p, p }, age, empty);
    ctx.globalAlpha = 1;
    paintFlash(ctx, at, age, empty);
    if (!reduced) paintShock(ctx, { ...at, cy: Math.round((y + tileH * 0.12) / p) * p }, age, empty);
    if (!reduced && !empty) for (const shard of SHARDS) paintShard(ctx, at, shard, age);
    ctx.restore();
}

/**
 * The short trail right behind the seed, newest first: white, then lilac, then violet, one dot apart with a deep violet shadow.
 * @param {Array<{x:number,y:number}>} points
 */
export function paintChorusPath(ctx, points, { p }) {
    ctx.save();
    points.forEach((point, index) => {
        const older = index / Math.max(1, points.length), size = older < 0.3 ? 2 * p : p;
        const x = Math.round((point.x - size / 2) / p) * p, y = Math.round((point.y - size / 2) / p) * p;
        ctx.globalAlpha = older < 0.5 ? 1 : 1.7 - older * 1.4;
        ctx.fillStyle = DEEP;
        ctx.fillRect(x, y + p, size, size);
        ctx.fillStyle = older < 0.3 ? WHITE : older < 0.65 ? LILAC : VIOLET;
        ctx.fillRect(x, y, size, size);
    });
    ctx.restore();
}

/** Light on the floor under the casting bulb, from its wind-up until just after its seed lands: violet glow laid over the stone
 * (overlay keeps the stone's own texture), brighter toward the middle, with a few lilac glints on its rim. */
export function paintChorusCasterGlow(ctx, footprint, strength) {
    const p = chorusDot(footprint), { x, y, tileW, tileH } = footprint, cx = Math.round(x / p) * p, cy = Math.round(y / p) * p;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = GLOW;
    for (const [reach, alpha] of [[0.72, 0.4], [0.52, 0.45], [0.32, 0.5]]) {
        ctx.globalAlpha = alpha * strength;
        steppedOval(ctx, { cx, cy, rx: tileW * reach, ry: tileH * reach }, p);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = strength;
    ctx.fillStyle = LILAC;
    for (let i = 0; i < 10; i++) {
        const a = (i + 0.5) / 10 * Math.PI * 2;
        ctx.fillRect(Math.round((cx + Math.cos(a) * tileW * 0.68) / p) * p, Math.round((cy + Math.sin(a) * tileH * 0.66) / p) * p, p, p);
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
        for (let i = -reach; i <= reach; i += p) {
            ctx.fillStyle = DEEP;
            ctx.fillRect(cx + i * dx + 1, cy + i * dy + 1, p, p);
            ctx.fillStyle = age < 50 ? WHITE : LILAC;
            ctx.fillRect(cx + i * dx, cy + i * dy, p, p);
        }
    }
    ctx.restore();
}
