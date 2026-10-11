'use strict';
// 옆에서 보는 무대의 몬스터를 칠하는 법(docs/stage-view-20261011.md): render.cjs와 같은 입체 모델을 무대 조각 묶음의 화풍에 맞춰 칠한다.
// The same signed-distance models as render.cjs, shaded to sit in the painted stage: a sun from the upper left that casts
// shadows, shade where parts meet, a ramp of six to eight tones that runs through colours picked by hand (read from the
// game's older monster pictures), a light line on lit edges, a rim in the monster's own dark colour. Every dot is still
// decided once on the dot grid: hard edges, a few colours per material, lone dots taken up by their neighbours.
const S = require('./render.cjs');
const { add, sub, mul, dot, norm, lerp, clamp, UP, hexToRgb } = S;

const ELEVATION = 18 * Math.PI / 180;
const FORWARD = [0, -Math.sin(ELEVATION), -Math.cos(ELEVATION)], VIEW = mul(FORWARD, -1);
const SUN = norm([-0.52, 0.76, 0.5]);

// ---------------------------------------------------------------- colour
/** A ramp of n tones that passes through the given colours, darkest first. */
function through(colours, n = colours.length) {
    const keys = colours.map(hexToRgb);
    return Array.from({ length: n }, (_, i) => {
        const at = i / (n - 1) * (keys.length - 1), low = Math.min(keys.length - 2, Math.floor(at)), t = at - low;
        return [0, 1, 2].map(c => Math.round(lerp(keys[low][c], keys[low + 1][c], t)));
    });
}

// ---------------------------------------------------------------- noise
function hashInt(x, y, z, seed) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1440662683) ^ Math.imul(seed | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
}
const hash3 = (x, y, z, seed) => hashInt(x, y, z, seed) / 4294967296;
const smooth = t => t * t * (3 - 2 * t);
function noise(p, scale, seed) {
    const x = p[0] * scale, y = p[1] * scale, z = p[2] * scale, ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = smooth(x - ix), fy = smooth(y - iy), fz = smooth(z - iz), at = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz, seed);
    return lerp(lerp(lerp(at(0, 0, 0), at(1, 0, 0), fx), lerp(at(0, 1, 0), at(1, 1, 0), fx), fy),
        lerp(lerp(at(0, 0, 1), at(1, 0, 1), fx), lerp(at(0, 1, 1), at(1, 1, 1), fx), fy), fz);
}
const fbm = (p, scale, seed) => (noise(p, scale, seed) * 4 + noise(p, scale * 2.1, seed + 17) * 2 + noise(p, scale * 4.3, seed + 31)) / 7;

// ---------------------------------------------------------------- scene queries
function smoothMin(a, b, k) { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return lerp(b, a, h) - k * h * (1 - h); }
/** Distance to the scene and the part that owns the nearest surface (as in render.cjs: parts of one group blend). */
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
    const e = 0.4, d = q => probe(parts, q).d;
    return norm([d([p[0] + e, p[1], p[2]]) - d([p[0] - e, p[1], p[2]]), d([p[0], p[1] + e, p[2]]) - d([p[0], p[1] - e, p[2]]), d([p[0], p[1], p[2] + e]) - d([p[0], p[1], p[2] - e])]);
}
/** How much of the sun reaches p (0 in a cast shadow, soft at its edge). */
function sunAt(parts, p, n) {
    let t = 1.4, most = 1;
    const from = add(p, mul(n, 0.9));
    for (let i = 0; i < 30 && t < 80; i++) {
        const d = probe(parts, add(from, mul(SUN, t))).d;
        if (d < 0.03) return 0;
        most = Math.min(most, 5 * d / t);
        t += clamp(d, 0.7, 7);
    }
    return clamp(most, 0, 1);
}
/** How open the surface is round p (1 = open, lower in creases and where parts meet). */
function openAt(parts, p, n) {
    let closed = 0, weight = 1;
    for (const h of [1.6, 3.6, 6.6, 10.5]) { closed += (h - probe(parts, add(p, mul(n, h))).d) / h * weight; weight *= 0.62; }
    return clamp(1 - closed * 0.5, 0, 1);
}

/** Wood grain: wavering stripes that run along one direction (a unit vector). */
function grainAt(p, along) {
    const run = dot(p, along), q = sub(p, mul(along, run));
    return Math.sin((q[0] * 1.1 + q[1] * 1.5 + q[2] * 1.3) * 1.25 + fbm(p, 0.06, 9) * 8 + run * 0.1) * 0.07;
}
/** The light a surface point takes, 0..1, before it is cut into tones. local = the point in the part's own frame. */
function lightAt(parts, mat, hit) {
    const { p, n, local } = hit, facing = Math.max(0, dot(n, SUN)), lit = facing > 0 && !mat.unshadowed ? sunAt(parts, p, n) : facing > 0 ? 1 : 0;
    const open = mat.unshadowed ? 1 : openAt(parts, p, n);
    let v = 0.12 + 0.58 * facing * lit + 0.22 * (0.5 + 0.5 * n[1]) * open + 0.07 * Math.max(0, -n[1]);
    v = v * lerp(0.62, 1, open) + (mat.glow || 0);
    if (mat.mottle) v += (fbm(local, mat.mottle[0], 21) - 0.5) * mat.mottle[1];
    if (mat.grain) v += grainAt(local, mat.grain);
    const edge = Math.pow(1 - Math.max(0, dot(n, VIEW)), 2.2);
    if (mat.rimLight) v += mat.rimLight * edge * (0.35 + 0.65 * clamp(0.5 - 0.5 * dot(n, SUN), 0, 1));
    if (mat.rimDark) v -= mat.rimDark * edge;
    const spec = Math.max(0, dot(sub(mul(n, 2 * dot(n, SUN)), SUN), VIEW));
    if (mat.sheen) v += mat.sheen * Math.pow(spec, 5) * lit;
    if (mat.contrast) v = 0.45 + (v - 0.45) * mat.contrast;
    return { v, glint: !!mat.gloss && spec > (mat.glossAt ?? 0.94) && lit > 0.4 };
}

/**
 * Renders a scene to a size×size RGBA cell. feet = [x, y] of the world origin in the cell.
 * mats: name → { ramp, gloss?, glossAt?, sheen?, glow?, contrast?, rimLight?, rimDark?, mottle?: [scale, strength], grain?: [x, y, z],
 *   unshadowed?, rim?: hex, noRim?, noEdge? }.
 * The top tone of a glossy material is kept for its glints. A part may carry local(p): the point in the part's own frame,
 * so a mottled surface moves with the part.
 */
function paint(model, mats, size, feet) {
    const { parts, marks } = model, N = size * size, START = 120;
    const ids = new Int16Array(N).fill(-1), depth = new Float32Array(N), tone = new Int8Array(N), matOf = new Array(N), normals = new Array(N), glint = new Uint8Array(N);
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const origin = add(add([i + 0.5 - feet[0], 0, 0], mul(UP, feet[1] - j - 0.5)), mul(FORWARD, -START));
        let t = 0, hit = null;
        for (let step = 0; step < 110 && t < START * 2; step++) {
            const p = add(origin, mul(FORWARD, t)), found = probe(parts, p);
            if (found.d < 0.05) { hit = { p, part: found.owner }; break; }
            t += Math.max(0.08, found.d * 0.9);
        }
        if (!hit || hit.p[1] < -0.6) continue;
        const at = j * size + i, p = hit.p, n = normalAt(parts, p), mat = mats[(hit.part.paint && hit.part.paint(p)) || hit.part.mat];
        const light = lightAt(parts, mat, { p, n, local: hit.part.local ? hit.part.local(p) : p }), steps = mat.ramp.length, top = mat.gloss ? steps - 2 : steps - 1;
        tone[at] = light.glint ? steps - 1 : clamp(Math.floor(clamp(light.v, 0, 0.999) * (top + 1)), 0, top);
        glint[at] = light.glint ? 1 : 0;
        ids[at] = hit.part.order; depth[at] = t; matOf[at] = mat; normals[at] = n;
    }
    const lift = new Int8Array(N);
    for (let j = 1; j < size - 1; j++) for (let i = 1; i < size - 1; i++) {
        const at = j * size + i;
        if (ids[at] < 0 || glint[at]) continue;
        // a nearer part in front of this one: the dot behind the edge drops two tones
        if ([at - 1, at + 1, at - size, at + size].some(next => ids[next] >= 0 && ids[next] !== ids[at] && depth[next] < depth[at] - 1.4)) { lift[at] = -2; continue; }
        // a lit edge: the dot above or to the left is open air, something farther, or a face that turns away
        const lit = [at - size, at - 1].some(next => ids[next] < 0 || depth[next] > depth[at] + 1.6 || (ids[next] === ids[at] && dot(normals[next], normals[at]) < 0.72 && dot(normals[at], SUN) > dot(normals[next], SUN)));
        if (lit && dot(normals[at], SUN) > -0.1 && !matOf[at].noEdge) lift[at] = 1;
    }
    for (let at = 0; at < N; at++) if (ids[at] >= 0 && lift[at]) tone[at] = clamp(tone[at] + lift[at], 0, matOf[at].ramp.length - (matOf[at].gloss ? 2 : 1));
    // a lone dot takes the tone most of its neighbours of the same material wear
    const settled = tone.slice();
    for (let j = 1; j < size - 1; j++) for (let i = 1; i < size - 1; i++) {
        const at = j * size + i;
        if (ids[at] < 0 || glint[at]) continue;
        const same = next => ids[next] >= 0 && matOf[next] === matOf[at];
        if ([at - 1, at + 1, at - size, at + size].some(next => same(next) && tone[next] === tone[at])) continue;
        const tally = new Map();
        for (const next of [at - 1, at + 1, at - size, at + size, at - size - 1, at - size + 1, at + size - 1, at + size + 1]) if (same(next)) tally.set(tone[next], (tally.get(tone[next]) || 0) + 1);
        if (tally.size) settled[at] = [...tally].sort((a, b) => b[1] - a[1] || Math.abs(a[0] - tone[at]) - Math.abs(b[0] - tone[at]))[0][0];
    }
    const rgba = new Uint8Array(N * 4);
    for (let at = 0; at < N; at++) if (ids[at] >= 0) { const c = matOf[at].ramp[settled[at]]; rgba.set([c[0], c[1], c[2], 255], at * 4); }
    // rim: one dot round the silhouette in the material's rim colour (its own dark, as the older pictures have it)
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const at = j * size + i;
        if (ids[at] >= 0) continue;
        const near = [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]].find(([x, y]) => x >= 0 && y >= 0 && x < size && y < size && ids[y * size + x] >= 0);
        const mat = near ? matOf[near[1] * size + near[0]] : null;
        if (!mat || mat.noRim) continue;
        const dark = mat.rim ? hexToRgb(mat.rim) : mat.ramp[0].map((value, c) => Math.round(lerp(value, [22, 15, 11][c], 0.6)));
        rgba.set([dark[0], dark[1], dark[2], 255], at * 4);
    }
    for (const mark of marks) {
        const sx = Math.floor(mark.point[0] + feet[0]), sy = Math.floor(feet[1] - (mark.point[1] * UP[1] + mark.point[2] * UP[2]));
        if (sx < 0 || sy < 0 || sx >= size || sy >= size || ids[sy * size + sx] < 0) continue;
        rgba.set([...hexToRgb(mark.colour), 255], (sy * size + sx) * 4);
    }
    return rgba;
}

module.exports = { paint, through, noise, fbm };
