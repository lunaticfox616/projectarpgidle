'use strict';
// 옆에서 보는 무대의 몬스터 그리기(docs/stage-view-20261011.md): 부호 거리 입체 몇 개를 광선으로 쏘아 도트로 찍는다.
// Side-view stage monsters: a few signed-distance solids ray-cast to dots, cel-shaded with a hue-shifted ramp and a dark rim.
// x = the way the monster faces (right), y = up, z = toward the viewer. One unit = one art px. The camera looks from the
// side, raised by ELEVATION so a little of the top shows (the stage floor is drawn at half depth).
const ELEVATION = 18 * Math.PI / 180;
const LIGHT = norm([-0.45, 0.8, 0.55]);
const FORWARD = [0, -Math.sin(ELEVATION), -Math.cos(ELEVATION)], UP = [0, Math.cos(ELEVATION), -Math.sin(ELEVATION)];

function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function len(a) { return Math.hypot(a[0], a[1], a[2]); }
function norm(a) { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const ease = t => t * t * (3 - 2 * t);

/** Rotation about z (in the picture plane, turning x toward y), around pivot. */
function rotz(p, angle, pivot = [0, 0, 0]) {
    const c = Math.cos(angle), s = Math.sin(angle), x = p[0] - pivot[0], y = p[1] - pivot[1];
    return [pivot[0] + x * c - y * s, pivot[1] + x * s + y * c, p[2]];
}

/** Rotation about x (turning y toward z) and about y (turning z toward x), around pivot. */
function rotx(p, angle, pivot = [0, 0, 0]) {
    const c = Math.cos(angle), s = Math.sin(angle), y = p[1] - pivot[1], z = p[2] - pivot[2];
    return [p[0], pivot[1] + y * c - z * s, pivot[2] + y * s + z * c];
}
function roty(p, angle, pivot = [0, 0, 0]) {
    const c = Math.cos(angle), s = Math.sin(angle), x = p[0] - pivot[0], z = p[2] - pivot[2];
    return [pivot[0] + x * c + z * s, p[1], pivot[2] - x * s + z * c];
}

// ---------------------------------------------------------------- solids
function sphere(c, r) { return p => len(sub(p, c)) - r; }
/** A box with half sizes h, its edges rounded by r. */
function box(c, h, r = 0) {
    return p => {
        const q = [Math.abs(p[0] - c[0]) - h[0] + r, Math.abs(p[1] - c[1]) - h[1] + r, Math.abs(p[2] - c[2]) - h[2] + r];
        return len([Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)]) + Math.min(Math.max(q[0], q[1], q[2]), 0) - r;
    };
}
/** An upright cylinder (axis y): centre c, radius, half height, edges rounded by r. */
function cylinder(c, radius, half, r = 0) {
    return p => {
        const side = Math.hypot(p[0] - c[0], p[2] - c[2]) - radius + r, cap = Math.abs(p[1] - c[1]) - half + r;
        return Math.min(Math.max(side, cap), 0) + Math.hypot(Math.max(side, 0), Math.max(cap, 0)) - r;
    };
}
/** A cylinder lying along x: centre c, radius, half length. */
function barrel(c, radius, half) {
    return p => Math.max(Math.hypot(p[1] - c[1], p[2] - c[2]) - radius, Math.abs(p[0] - c[0]) - half);
}
/** A ring lying flat (axis y): ring radius, tube radius. */
function torus(c, ring, tube) {
    return p => Math.hypot(Math.hypot(p[0] - c[0], p[2] - c[2]) - ring, p[1] - c[1]) - tube;
}
/** An octahedron (a crystal): half size s per axis. */
function octa(c, s) {
    return p => (Math.abs(p[0] - c[0]) / s[0] + Math.abs(p[1] - c[1]) / s[1] + Math.abs(p[2] - c[2]) / s[2] - 1) * Math.min(s[0], s[1], s[2]) * 0.577;
}
/** a without b; a only above the height y; a seen through a moved or turned frame (move: p → the solid's own p). */
const without = (a, b) => p => Math.max(a(p), -b(p));
const above = (a, y) => p => Math.max(a(p), y - p[1]);
const below = (a, y) => p => Math.max(a(p), p[1] - y);
const moved = (a, move) => p => a(move(p));
/** Ellipsoid with radii r, optionally turned by `turn` radians about z. */
function ellipsoid(c, r, turn = 0) {
    return p => {
        const q = sub(turn ? rotz(p, -turn, c) : p, c);
        const k0 = Math.hypot(q[0] / r[0], q[1] / r[1], q[2] / r[2]);
        const k1 = Math.hypot(q[0] / (r[0] * r[0]), q[1] / (r[1] * r[1]), q[2] / (r[2] * r[2]));
        return k1 > 0 ? k0 * (k0 - 1) / k1 : -Math.min(r[0], r[1], r[2]);
    };
}
/** A capsule from a to b whose radius runs from ra to rb. */
function limb(a, b, ra, rb = ra) {
    const ab = sub(b, a), l2 = dot(ab, ab) || 1;
    return p => {
        const t = clamp(dot(sub(p, a), ab) / l2, 0, 1);
        return len(sub(p, add(a, mul(ab, t)))) - lerp(ra, rb, t);
    };
}
/** Capsules through a list of points; radii per point. */
function chain(points, radii) {
    const parts = points.slice(1).map((point, i) => limb(points[i], point, radii[i], radii[i + 1] ?? radii[i]));
    return p => Math.min(...parts.map(part => part(p)));
}
function smoothMin(a, b, k) {
    const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1);
    return lerp(b, a, h) - k * h * (1 - h);
}

// ---------------------------------------------------------------- colour
function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
}
function hslToRgb([h, s, l]) {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
/** Five tones round a base colour: shadows lean to violet and lose light, highlights lean to yellow and lose saturation. */
function ramp(hex, options = {}) {
    const [h, s, l] = rgbToHsl(hexToRgb(hex)), cool = options.cool ?? 22, warm = options.warm ?? 14;
    const steps = [[-cool, 1.05, 0.38], [-cool * 0.5, 1.1, 0.66], [0, 1, 1], [warm * 0.5, 0.9, 1.2], [warm, 0.66, 1.42]];
    return steps.map(([dh, ks, kl]) => hslToRgb([(h + dh + 360) % 360, clamp(s * ks, 0, 1), clamp(l * kl, 0.04, 0.94)]));
}

// ---------------------------------------------------------------- scene
function scene() {
    const parts = [], marks = [];
    return {
        parts, marks,
        /** mat: material name; options: group (parts of one group melt together by k), k, paint(p) → another material name or null,
         *  local(p) → the point in the part's own frame (paint.cjs lays a mottled surface in that frame so it moves with the part). */
        add(sdf, mat, options = {}) { parts.push({ sdf, mat, group: options.group || null, k: options.k ?? 0, paint: options.paint || null, local: options.local || null, order: parts.length }); },
        /** A single dot of colour at a world point (eye glints), drawn after shading when that point is not hidden. */
        mark(point, colour) { marks.push({ point, colour }); }
    };
}
/** Distance to the scene and the part that owns the nearest surface. Parts of one group blend smoothly. */
function probe(parts, p) {
    let best = Infinity, owner = null;
    const groups = new Map();
    for (const part of parts) {
        const d = part.sdf(p);
        if (part.group) {
            const g = groups.get(part.group);
            if (!g) groups.set(part.group, { d, owner: part, raw: d, k: part.k });
            else { if (d < g.raw) { g.raw = d; g.owner = part; } g.d = smoothMin(g.d, d, Math.max(g.k, part.k) || 0.01); }
        } else if (d < best) { best = d; owner = part; }
    }
    for (const g of groups.values()) if (g.d < best) { best = g.d; owner = g.owner; }
    return { d: best, owner };
}
function normalAt(parts, p) {
    const e = 0.35, d = q => probe(parts, q).d;
    return norm([d([p[0] + e, p[1], p[2]]) - d([p[0] - e, p[1], p[2]]), d([p[0], p[1] + e, p[2]]) - d([p[0], p[1] - e, p[2]]), d([p[0], p[1], p[2] + e]) - d([p[0], p[1], p[2] - e])]);
}

/**
 * Renders a scene to a size×size RGBA cell. feet = [x, y] of the world origin in the cell.
 * mats: name → { ramp: [5 rgb], gloss?, glow?, cuts? }.
 */
function render(model, mats, size, feet) {
    const { parts, marks } = model;
    const ids = new Int16Array(size * size).fill(-1), depth = new Float32Array(size * size), tone = new Int8Array(size * size), matOf = new Array(size * size);
    const rgba = new Uint8Array(size * size * 4), START = 120;
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        // the world point on the camera plane for this pixel: origin + right*(i-feetX) + up*(feetY-j)
        const origin = add(add([i + 0.5 - feet[0], 0, 0], mul(UP, feet[1] - j - 0.5)), mul(FORWARD, -START));
        let t = 0, hit = null;
        for (let step = 0; step < 90 && t < START * 2; step++) {
            const p = add(origin, mul(FORWARD, t)), found = probe(parts, p);
            if (found.d < 0.05) { hit = { p, part: found.owner }; break; }
            t += Math.max(0.08, found.d * 0.9);
        }
        if (!hit || hit.p[1] < -0.6) continue;
        const at = j * size + i, n = normalAt(parts, hit.p), name = (hit.part.paint && hit.part.paint(hit.p)) || hit.part.mat, mat = mats[name];
        const diffuse = dot(n, LIGHT), half = 0.5 + 0.5 * diffuse, under = clamp(-n[1], 0, 1) * 0.25;
        const floor = clamp((5 - hit.p[1]) / 5, 0, 1) * 0.1;   // a little darker where it meets the ground
        const value = clamp(half * half - under - floor + (mat.glow ? 0.18 : 0), 0, 1), cuts = mat.cuts || [0.14, 0.34, 0.66, 0.9];
        let index = cuts.findIndex(cut => value < cut);
        if (index < 0) index = cuts.length;
        const view = mul(FORWARD, -1), mirror = sub(mul(n, 2 * dot(n, LIGHT)), LIGHT);
        if (mat.gloss && dot(mirror, view) > 0.93) index = 4;
        ids[at] = hit.part.order; depth[at] = t; tone[at] = index; matOf[at] = mat;
    }
    // inner lines: where a nearer part overlaps this one, the pixel behind the edge drops two tones
    for (let j = 1; j < size - 1; j++) for (let i = 1; i < size - 1; i++) {
        const at = j * size + i;
        if (ids[at] < 0) continue;
        for (const next of [at - 1, at + 1, at - size, at + size]) {
            if (ids[next] >= 0 && ids[next] !== ids[at] && depth[next] < depth[at] - 1.4) { tone[at] = Math.max(0, tone[at] - 2); break; }
        }
    }
    for (let at = 0; at < size * size; at++) {
        if (ids[at] < 0) continue;
        const colour = matOf[at].ramp[tone[at]];
        rgba.set([colour[0], colour[1], colour[2], 255], at * 4);
    }
    // rim: one dot round the silhouette in the neighbour's darkest tone, darkened again
    const rim = [];
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const at = j * size + i;
        if (ids[at] >= 0) continue;
        const near = [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]].find(([x, y]) => x >= 0 && y >= 0 && x < size && y < size && ids[y * size + x] >= 0);
        if (near) rim.push([at, matOf[near[1] * size + near[0]]]);
    }
    for (const [at, mat] of rim) {
        if (mat.noRim) continue;
        const dark = mat.ramp[0];
        const k = mat.rim ?? 0.42;   // the rim keeps a trace of the material's hue, like the characters' dark outlines
        rgba.set([Math.round(dark[0] * k), Math.round(dark[1] * k * 0.85), Math.round(dark[2] * k * 1.05), 255], at * 4);
    }
    for (const mark of marks) {
        const sx = Math.floor(mark.point[0] + feet[0]), rel = mark.point, sy = Math.floor(feet[1] - (rel[1] * UP[1] + rel[2] * UP[2]));
        if (sx < 0 || sy < 0 || sx >= size || sy >= size || ids[sy * size + sx] < 0) continue;
        rgba.set([...hexToRgb(mark.colour), 255], (sy * size + sx) * 4);
    }
    return rgba;
}

/** Frames (each size×size RGBA) side by side → one RGBA strip { width, height, data }. */
function strip(frames, size) {
    const data = new Uint8Array(frames.length * size * size * 4);
    frames.forEach((frame, f) => { for (let y = 0; y < size; y++) data.set(frame.subarray(y * size * 4, (y + 1) * size * 4), (y * frames.length * size + f * size) * 4); });
    return { width: frames.length * size, height: size, data };
}

module.exports = { add, sub, mul, dot, len, norm, lerp, mix, clamp, ease, rotz, rotx, roty, sphere, box, cylinder, barrel, torus, octa, without, above, below, moved,
    ellipsoid, limb, chain, ramp, hexToRgb, scene, render, strip, UP };
