// The hero and the core of the loop cinematic, drawn on the screen canvas at a whole number of device pixels per dot so the real
// idle sheet stays crisp. The hero is never bent or shoved: it stands, dissolves into motes feet first, or forms from the core.
import { SHOTS, clamp01, lerp, smooth, easeOutCubic, hash } from './loop-cinematic-timeline.mjs';

const CORE_ROWS = [[2, 2], [1, 4], [0, 6], [0, 6], [1, 4], [2, 2]]; // per row [start, width] of the 6x6 diamond
const HS = () => SHOTS.hero.scale;

/** A hard-edged circle as whole-pixel rows (no anti-aliasing). */
export function circlePath(ctx, cx, cy, R, limit) {
    ctx.beginPath();
    const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(limit, Math.ceil(cy + R));
    for (let y = y0; y < y1; y++) {
        const dy = y + 0.5 - cy, hw = Math.sqrt(Math.max(0, R * R - dy * dy));
        const a = Math.round(cx - hw), b = Math.round(cx + hw);
        if (b > a) ctx.rect(a, y, b - a, 1);
    }
}

export function idleFrame(sheet, ms) {
    const step = Array.isArray(sheet.ms) ? sheet.ms[0] : sheet.ms;
    return Math.floor(Math.max(0, ms) / (step || 130)) % (sheet.frames || 1);
}

/** World point -> top left device pixel of the sprite (feet at the sheet's anchor). */
function spriteOrigin(proj, sheet, feet) {
    const f = proj.toScreen(feet.x, feet.y), k = proj.heroK;
    return { x: Math.round(f.x - sheet.ax * k), y: Math.round(f.y - sheet.ay * k), k };
}

export function drawHero(ctx, proj, hero, frame, feet) {
    const o = spriteOrigin(proj, hero.sheet, feet), s = hero.sheet;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(hero.img, frame * s.w, 0, s.w, s.h, o.x, o.y, s.w * o.k, s.h * o.k);
}

function thresholdsOut(sheet, fp) {
    if (fp.th.out) return fp.th.out;
    const tall = Math.max(1, sheet.ay - fp.minY), th = new Float32Array(fp.px.length);
    fp.px.forEach((q, k) => { th[k] = clamp01((sheet.ay - q.y) / tall * 0.84 + hash(k * 1.7 + 0.3) * 0.16); });
    return (fp.th.out = th);
}

function thresholdsIn(sheet, fp) {
    if (fp.th.in) return fp.th.in;
    const cx = sheet.ax, cy = sheet.ay - SHOTS.hero.chestPx;
    let maxD = 1;
    fp.px.forEach(q => { maxD = Math.max(maxD, Math.hypot(q.x - cx, q.y - cy)); });
    const th = new Float32Array(fp.px.length);
    fp.px.forEach((q, k) => { th[k] = clamp01(Math.hypot(q.x - cx, q.y - cy) / maxD * 0.86 + hash(k * 2.3 + 0.7) * 0.14); });
    return (fp.th.in = th);
}

/** The dots past the threshold, the edge lit gold white. */
function paintDissolve(fp, th, p, out) {
    const data = fp.data, image = fp.image.data;
    image.fill(0);
    for (let k = 0; k < fp.px.length; k++) {
        const t = th[k], visible = out ? t > p : t < p;
        if (!visible) continue;
        const edge = out ? (p > 0 && t < p + 0.05) : (p < 1 && t > p - 0.06), i = fp.px[k].i, mix = edge ? 0.7 : 0;
        image[i] = data[i] * (1 - mix) + 255 * mix;
        image[i + 1] = data[i + 1] * (1 - mix) + 238 * mix;
        image[i + 2] = data[i + 2] * (1 - mix) + 196 * mix;
        image[i + 3] = data[i + 3];
    }
}

/** mode 'out': the feet go first; 'in': the body grows outward from the chest. */
export function drawDissolve(ctx, proj, hero, { frame, feet, mode }, p) {
    const fp = hero.pixels(frame), out = mode === 'out';
    paintDissolve(fp, out ? thresholdsOut(hero.sheet, fp) : thresholdsIn(hero.sheet, fp), p, out);
    fp.ctx.putImageData(fp.image, 0, 0);
    const o = spriteOrigin(proj, hero.sheet, feet);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(fp.canvas, o.x, o.y, hero.sheet.w * o.k, hero.sheet.h * o.k);
}

function moteColour(fp, i, step) {
    const d = fp.data;
    return `rgb(${Math.round(lerp(d[i], 255, step))},${Math.round(lerp(d[i + 1], 240, step))},${Math.round(lerp(d[i + 2], 196, step))})`;
}

/** Where a scattering dot is at age u: a gentle counter-clockwise curve that crosses the ring's stone rim and ends inside the ring
 * (2026-11-21 사용자: 가루가 테두리 위까지 나와야 한다. 돌테 위에서 끝나던 때는 그 경계에서 사라져 보였다). */
function motePath(k, start, ring, u) {
    const sc = SHOTS.scatter, bend = Math.tan(sc.moteCurl * Math.PI / 2) / 2, e = smooth(u);
    const a = Math.atan2(start.y - ring.y, start.x - ring.x) + (hash(k * 2.9) - 0.5) * 2 * sc.moteEndJitter;
    const rim = lerp(sc.moteEndPx[0], sc.moteEndPx[1], hash(k * 4.1)), ex = ring.x + rim * Math.cos(a), ey = ring.y + rim * Math.sin(a);
    const cl = Math.hypot(ex - start.x, ey - start.y) || 1, dx = (ex - start.x) / cl, dy = (ey - start.y) / cl;
    const cx = (start.x + ex) / 2 - dy * cl * bend, cy = (start.y + ey) / 2 + dx * cl * bend;
    return { x: (1 - e) * (1 - e) * start.x + 2 * (1 - e) * e * cx + e * e * ex, y: (1 - e) * (1 - e) * start.y + 2 * (1 - e) * e * cy + e * e * ey };
}

/** The motes leaving the body toward the ring (timing: start, dur, now, life [min, max] ms). */
export function drawMotesOut(ctx, proj, hero, { frame, feet }, timing) {
    const fp = hero.pixels(frame), th = thresholdsOut(hero.sheet, fp), s = hero.sheet, size = proj.heroK;
    for (let k = 0; k < fp.px.length; k += 2) {
        const age = timing.now - (timing.start + th[k] * timing.dur), life = lerp(timing.life[0], timing.life[1], hash(k * 0.37 + 5.1));
        if (age < 0 || age >= life) continue;
        const q = fp.px[k], u = age / life, start = { x: feet.x + (q.x - s.ax) * HS(), y: feet.y + (q.y - s.ay) * HS() };
        const m = motePath(k, start, SHOTS.ring, u), at = proj.toScreen(m.x, m.y);
        ctx.globalAlpha = 1 - smooth((u - SHOTS.scatter.moteFadeFrom) / (1 - SHOTS.scatter.moteFadeFrom));
        ctx.fillStyle = moteColour(fp, q.i, Math.min(3, Math.floor(u * 4)) / 3);
        ctx.fillRect(Math.round(at.x), Math.round(at.y), size, size);
    }
    ctx.globalAlpha = 1;
}

/** The motes leaving the core for their place in the forming body (timing: start, dur, now, moteMs). */
export function drawMotesIn(ctx, proj, hero, { feet, core }, timing) {
    const fp = hero.pixels(0), th = thresholdsIn(hero.sheet, fp), s = hero.sheet, size = proj.heroK;
    for (let k = 0; k < fp.px.length; k += 3) {
        const arrive = timing.start + th[k] * timing.dur, u = (timing.now - (arrive - timing.moteMs)) / timing.moteMs;
        if (u < 0 || u >= 1) continue;
        const q = fp.px[k], e = easeOutCubic(u), curl = (1 - e) * 10 * (hash(k) - 0.5);
        const tx = feet.x + (q.x - s.ax) * HS(), ty = feet.y + (q.y - s.ay) * HS();
        const at = proj.toScreen(lerp(core.x, tx, e) + curl, lerp(core.y, ty, e));
        ctx.fillStyle = u < 0.6 ? '#fff4d6' : moteColour(fp, q.i, 0);
        ctx.fillRect(Math.round(at.x), Math.round(at.y), size, size);
    }
}

export function chestOf(feet) { return { x: feet.x, y: feet.y - SHOTS.hero.chestPx * HS() }; }

/** The core: a 6x6 gold white diamond with a two-step halo beating every pulseMs. */
export function drawCore(ctx, proj, at, alpha, clock) {
    if (alpha <= 0) return;
    const c = SHOTS.core, beat = Math.floor(clock / c.pulseMs) % 2, k = proj.coreK, p = proj.toScreen(at.x, at.y);
    const x = Math.round(p.x), y = Math.round(p.y);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    circlePath(ctx, x, y, (c.haloR[1] + beat) * k, Infinity);
    ctx.fillStyle = `rgba(255,206,120,${((beat ? 0.16 : 0.24) * alpha).toFixed(3)})`; ctx.fill();
    circlePath(ctx, x, y, (c.haloR[0] + beat) * k, Infinity);
    ctx.fillStyle = `rgba(255,226,160,${((beat ? 0.30 : 0.42) * alpha).toFixed(3)})`; ctx.fill();
    ctx.restore();
    ctx.globalAlpha = alpha;
    CORE_ROWS.forEach(([sx, w], row) => {
        ctx.fillStyle = '#ffd27a';
        ctx.fillRect(x + (sx - 3) * k, y + (row - 3) * k, w * k, k);
        if (w > 2) { ctx.fillStyle = '#fffbea'; ctx.fillRect(x + (sx - 2) * k, y + (row - 3) * k, (w - 2) * k, k); }
    });
    ctx.globalAlpha = 1;
}

/** A moving core: pos(ms) is its place (with an optional a for alpha); the last places trail behind as shrinking squares. */
export function drawCoreMoving(ctx, proj, pos, ms) {
    const c = SHOTS.core, now = pos(ms);
    if (!now) return;
    const alpha = now.a == null ? 1 : now.a;
    for (let k = c.trail; k >= 1; k--) {
        const p = pos(ms - k * c.trailStepMs);
        if (!p || Math.hypot(p.x - now.x, p.y - now.y) < 2) continue;
        const size = Math.max(1, Math.round(5 - k * 0.7)) * proj.coreK, at = proj.toScreen(p.x, p.y);
        ctx.fillStyle = `rgba(255,224,150,${((1 - k / (c.trail + 1)) * 0.75 * alpha).toFixed(3)})`;
        ctx.fillRect(Math.round(at.x - size / 2), Math.round(at.y - size / 2), size, size);
    }
    drawCore(ctx, proj, now, alpha, ms);
}
