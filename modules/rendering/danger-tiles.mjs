// Ground danger tiles for cell attacks (the Rootlet's waves, the chorus seed's aimed cell), drawn in whole dots. A cell that will be
// struck owns a warm hatched tile whose solid band closes from the cell edges toward its middle as the strike nears, under a dark
// outline and a bright inner edge that turns hot white just before the hit. A wave that is not yet next keeps only a cool dashed edge.
// Paint only: the cells come from the combat snapshot.

const DARK = '#22111a';
const SEAM = 'rgba(96,30,20,0.7)';
const WARM = /* @__PURE__ */ Object.freeze({ band: '#c64a26', dither: '#e9743a', hatch: '#ff9a4c', edge: '#ffa24a' });
const HOT = /* @__PURE__ */ Object.freeze({ band: '#e2602a', dither: '#ffa451', hatch: '#ffc77a', edge: '#ffeaa0' });
const CHAOS = /* @__PURE__ */ Object.freeze({ band: '#7c2fb8', dither: '#a64fe6', hatch: '#c77dff', edge: '#e9b8ff' });
const CHAOS_HOT = /* @__PURE__ */ Object.freeze({ band: '#9b3fde', dither: '#cf86ff', hatch: '#e7b6ff', edge: '#fff0ff' });
const SAFE = /* @__PURE__ */ Object.freeze({ tick: '#aef0c6', ink: '#11221a' });
const LATER = /* @__PURE__ */ Object.freeze({ dash: '#b8c4d4', ink: '#1d1822' });
const SIDES = /* @__PURE__ */ Object.freeze([[0, -1], [1, 0], [0, 1], [-1, 0]]);
const patterns = new Map();

/** One art dot for the warning tiles at this tile size (2 px on a 390 px phone, 3 px on a PC). */
export function dangerTileDot(footprint) {
    return Math.max(1, Math.round(footprint.tileH / 13));
}

function cellBox({ x, y }, { tileW, tileH }) {
    const left = Math.round(x - tileW / 2), top = Math.round(y - tileH / 2);
    return { left, top, right: Math.round(x + tileW / 2), bottom: Math.round(y + tileH / 2) };
}

function cellKeys(points) {
    return new Set(points.map(({ gx, gy }) => `${gx}:${gy}`));
}

/** A cached diagonal hatch: every `period`th diagonal of dots, in one colour. */
function dotPattern(ctx, period, colour, p) {
    const key = `${period}|${colour}|${p}`;
    if (patterns.has(key)) return patterns.get(key);
    const tile = ctx.canvas.ownerDocument.createElement('canvas');
    tile.width = tile.height = period * p;
    const paint = tile.getContext('2d');
    paint.fillStyle = colour;
    for (let row = 0; row < period; row++) paint.fillRect(((period - row) % period) * p, row * p, p, p);
    const pattern = ctx.createPattern(tile, 'repeat');
    patterns.set(key, pattern);
    return pattern;
}

/** Charge 0 → 1 over the whole warning; the band starts one dot thick and covers the cell when it lands. */
function bandOf(box, charge, p) {
    const ease = Math.min(1, Math.max(0, charge)) ** 1.5;
    const halfW = (box.right - box.left) / 2, halfH = (box.bottom - box.top) / 2;
    const bx = Math.max(p, Math.round(ease * halfW / p) * p), by = Math.max(p, Math.round(ease * halfH / p) * p);
    return { bx: Math.min(bx, Math.ceil(halfW)), by: Math.min(by, Math.ceil(halfH)) };
}

function fillBand(ctx, box, band) {
    const { left, top, right, bottom } = box, { bx, by } = band;
    ctx.beginPath();
    ctx.rect(left, top, right - left, by);
    ctx.rect(left, bottom - by, right - left, by);
    ctx.rect(left, top + by, bx, bottom - top - 2 * by);
    ctx.rect(right - bx, top + by, bx, bottom - top - 2 * by);
    ctx.fill();
}

/** Edge rects for one side of a cell, `inset` dots in from the boundary. */
function sideRect(box, [dx, dy], inset, p) {
    const { left, top, right, bottom } = box, o = inset * p;
    if (dy < 0) return [left + o, top + o, right - left - 2 * o, p];
    if (dy > 0) return [left + o, bottom - o - p, right - left - 2 * o, p];
    if (dx < 0) return [left + o, top + o, p, bottom - top - 2 * o];
    return [right - o - p, top + o, p, bottom - top - 2 * o];
}

function openSides(point, keys) {
    return SIDES.filter(([dx, dy]) => !keys.has(`${point.gx + dx}:${point.gy + dy}`));
}

function paintActiveCell(ctx, box, look) {
    const { tones, charge, p, fade } = look, band = bandOf(box, charge, p);
    ctx.globalAlpha = fade * (0.42 + 0.4 * charge);
    ctx.fillStyle = look.hatch;
    ctx.fillRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
    ctx.globalAlpha = fade * (charge >= 0.84 ? 1 : 0.72);
    ctx.fillStyle = tones.band;
    fillBand(ctx, box, band);
    ctx.globalAlpha = fade;
    ctx.fillStyle = look.dither;
    fillBand(ctx, box, band);
}

function paintCellEdges(ctx, box, sides, look) {
    const { tones, p } = look;
    ctx.globalAlpha = look.fade;
    ctx.fillStyle = DARK;
    for (const side of sides) ctx.fillRect(...sideRect(box, side, 0, p));
    ctx.fillStyle = tones.edge;
    for (const side of sides) ctx.fillRect(...sideRect(box, side, 1, p));
}

function paintSeams(ctx, box, point, keys) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = SEAM;
    if (keys.has(`${point.gx + 1}:${point.gy}`)) ctx.fillRect(box.right - 1, box.top, 1, box.bottom - box.top);
    if (keys.has(`${point.gx}:${point.gy + 1}`)) ctx.fillRect(box.left, box.bottom - 1, box.right - box.left, 1);
}

function activeLook(ctx, charge, p, chaos) {
    const hot = charge >= 0.84, tones = chaos ? (hot ? CHAOS_HOT : CHAOS) : (hot ? HOT : WARM);
    return { tones, charge, p, hatch: dotPattern(ctx, 4, tones.hatch, p), dither: dotPattern(ctx, 4, tones.dither, p) };
}

function paintLaterCell(ctx, box, p) {
    const dash = 3 * p, gap = 2 * p;
    ctx.globalAlpha = 0.95;
    /** @type {Array<[string, number]>} ink one pixel wider under the pale dash */
    const passes = [[LATER.ink, 1], [LATER.dash, 0]];
    for (const [colour, grow] of passes) {
        ctx.fillStyle = colour;
        for (let x = box.left + p; x < box.right - p; x += dash + gap) {
            const w = Math.min(dash, box.right - p - x);
            ctx.fillRect(x - grow, box.top + p - grow, w + 2 * grow, p + 2 * grow);
            ctx.fillRect(x - grow, box.bottom - 2 * p - grow, w + 2 * grow, p + 2 * grow);
        }
        for (let y = box.top + p; y < box.bottom - p; y += dash + gap) {
            const h = Math.min(dash, box.bottom - p - y);
            ctx.fillRect(box.left + p - grow, y - grow, p + 2 * grow, h + 2 * grow);
            ctx.fillRect(box.right - 2 * p - grow, y - grow, p + 2 * grow, h + 2 * grow);
        }
    }
}

/**
 * Ground pass, under the actors (inside the caller's terrain clip).
 * @param {{points:Array<{gx:number,gy:number,x:number,y:number}>,tileW:number,tileH:number}} footprint
 * @param {{charge?:number, later?:boolean, chaos?:boolean}} warning charge 0 → 1 until this wave lands; later: a wave that is not yet
 * next; chaos: the chaos element's violet instead of the warm earth tones
 */
export function paintDangerTiles(ctx, footprint, warning) {
    const p = dangerTileDot(footprint), keys = cellKeys(footprint.points), fade = ctx.globalAlpha;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    if (warning.later) {
        for (const point of footprint.points) paintLaterCell(ctx, cellBox(point, footprint), p);
        ctx.restore();
        return;
    }
    const look = { ...activeLook(ctx, warning.charge || 0, p, warning.chaos), fade };
    for (const point of footprint.points) {
        const box = cellBox(point, footprint);
        paintActiveCell(ctx, box, look);
        paintSeams(ctx, box, point, keys);
        paintCellEdges(ctx, box, openSides(point, keys), look);
    }
    ctx.restore();
}

const overlaps = (box, rect) => box.left < rect.right && rect.left < box.right && box.top < rect.bottom && rect.top < box.bottom;

/**
 * Over-actor pass: corner marks of the struck cells a body stands over, so they still read without hiding the body.
 * @param {{points:Array<{gx:number,gy:number,x:number,y:number}>,tileW:number,tileH:number}} footprint
 * @param {{charge:number, cover:Array<{left:number,top:number,right:number,bottom:number}>}} warning cover: the bodies' screen boxes
 */
export function paintDangerTileEdges(ctx, footprint, warning) {
    const { charge, cover } = warning, p = dangerTileDot(footprint), tones = charge >= 0.84 ? HOT : WARM;
    const rows = footprint.points.map(point => ({ box: cellBox(point, footprint) })).filter(({ box }) => cover.some(rect => overlaps(box, rect)));
    if (!rows.length) return;
    const corners = rows.flatMap(({ box }) => [[box.left + p, box.top + p, 1, 1], [box.right - 2 * p, box.top + p, -1, 1],
        [box.left + p, box.bottom - 2 * p, 1, -1], [box.right - 2 * p, box.bottom - 2 * p, -1, -1]]);
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = DARK;
    ctx.translate(1, 1);
    for (const corner of corners) tick(ctx, corner, p, 3);
    ctx.translate(-1, -1);
    ctx.fillStyle = tones.edge;
    for (const corner of corners) tick(ctx, corner, p, 3);
    ctx.restore();
}

/** @param {number[]} corner [x, y, x step, y step] of an L mark's corner dot */
function tick(ctx, corner, p, length = 2) {
    const [x, y, sx, sy] = corner, arm = length * p;
    ctx.fillRect(sx > 0 ? x : x - arm + p, y, arm, p);
    ctx.fillRect(x, sy > 0 ? y : y - arm + p, p, arm);
}

/**
 * Mint corner ticks and a sparse mint hatch on the open cells around the hero while a wave nears (ground pass, inside the caller's
 * terrain clip).
 * @param {{points:Array<{gx:number,gy:number,x:number,y:number}>,tileW:number,tileH:number}} footprint the safe cells
 */
export function paintSafeTicks(ctx, footprint, strength) {
    const p = dangerTileDot(footprint), inset = 2 * p;
    const corners = footprint.points.flatMap(point => {
        const { left, top, right, bottom } = cellBox(point, footprint);
        return [[left + inset, top + inset, 1, 1], [right - inset - p, top + inset, -1, 1],
            [left + inset, bottom - inset - p, 1, -1], [right - inset - p, bottom - inset - p, -1, -1]];
    });
    ctx.save();
    ctx.globalAlpha = strength * 0.55;
    ctx.fillStyle = dotPattern(ctx, 4, SAFE.tick, p);
    for (const point of footprint.points) {
        const { left, top, right, bottom } = cellBox(point, footprint);
        ctx.fillRect(left + inset, top + inset, right - left - 2 * inset, bottom - top - 2 * inset);
    }
    ctx.globalAlpha = strength;
    ctx.fillStyle = SAFE.ink;
    ctx.translate(1, 1);
    for (const corner of corners) tick(ctx, corner, p, 3);
    ctx.translate(-1, -1);
    ctx.fillStyle = SAFE.tick;
    for (const corner of corners) tick(ctx, corner, p, 3);
    ctx.restore();
}
