'use strict';
// 옆에서 보는 무대의 몬스터를 2D로 그리는 법(시험): 부위마다 윤곽을 잡아 도트 격자에 바로 채우고, 셀 음영과 테를 입힌다.
// 2026-10-12 사용자: 입체를 쏘아 칠한 몬스터(render.cjs + paint.cjs)는 화풍이 맞지 않는다, "던파 몬스터 참고해서 우리 게임에
// 어울릴만한 몬스터들로 좀만 만들어볼래?". 던파의 몬스터는 손으로 그린 2D 도트다: 과장된 윤곽, 어두운 테, 서너 단계의 딱딱한 음영.
// A figure is a list of parts drawn back to front. A part is a closed outline (points in figure space: x right, y up, the
// origin at the feet, one unit = one dot), a ramp of five colours (dark to light) and marks drawn inside it. Every dot is
// decided once on the grid: no half transparency. Poses move the outlines themselves, so a turned limb is drawn fresh
// each frame and never resampled.
const { hexToRgb } = require('./render.cjs');

// ---------------------------------------------------------------- outlines
/** A closed smooth outline through the points (Catmull-Rom), as a polygon. */
function smooth(points, steps = 6) {
    const n = points.length, out = [];
    for (let i = 0; i < n; i++) {
        const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
        for (let s = 0; s < steps; s++) {
            const t = s / steps, t2 = t * t, t3 = t2 * t;
            out.push([0, 1].map(c => 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3)));
        }
    }
    return out;
}
/** An ellipse as a polygon: centre, radii, turned by `turn` radians. */
function oval(centre, radii, turn = 0, steps = 28) {
    const c = Math.cos(turn), s = Math.sin(turn);
    return Array.from({ length: steps }, (_, i) => {
        const a = i / steps * Math.PI * 2, x = Math.cos(a) * radii[0], y = Math.sin(a) * radii[1];
        return [centre[0] + x * c - y * s, centre[1] + x * s + y * c];
    });
}
/** A limb from a to b: a tapering strip with round ends (radii ra at a, rb at b). */
function limb(a, b, ra, rb = ra) {
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]), out = [];
    for (let i = 0; i <= 8; i++) { const t = angle + Math.PI / 2 + i / 8 * Math.PI; out.push([a[0] + Math.cos(t) * ra, a[1] + Math.sin(t) * ra]); }
    for (let i = 0; i <= 8; i++) { const t = angle - Math.PI / 2 + i / 8 * Math.PI; out.push([b[0] + Math.cos(t) * rb, b[1] + Math.sin(t) * rb]); }
    return out;
}
/** Points turned about a pivot (radians, counter-clockwise in figure space) and then moved. */
function placed(points, turn = 0, pivot = [0, 0], move = [0, 0]) {
    const c = Math.cos(turn), s = Math.sin(turn);
    return points.map(([x, y]) => [pivot[0] + (x - pivot[0]) * c - (y - pivot[1]) * s + move[0], pivot[1] + (x - pivot[0]) * s + (y - pivot[1]) * c + move[1]]);
}

// ---------------------------------------------------------------- canvas
function sheet(size, feet) {
    const n = size * size;
    return { size, feet, owner: new Int16Array(n).fill(-1), tone: new Int8Array(n), paint: new Int32Array(n).fill(-1), looks: [] };
}
/** The dots whose centres lie inside a polygon (figure space), as a mask. */
function maskOf(cv, polygon) {
    const { size, feet } = cv, mask = new Uint8Array(size * size), pts = polygon.map(([x, y]) => [feet[0] + x, feet[1] - y]);
    for (let j = 0; j < size; j++) {
        const y = j + 0.5, cuts = [];
        for (let i = 0; i < pts.length; i++) {
            const a = pts[i], b = pts[(i + 1) % pts.length];
            if ((a[1] <= y) !== (b[1] <= y)) cuts.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
        cuts.sort((p, q) => p - q);
        for (let k = 0; k + 1 < cuts.length; k += 2) for (let i = Math.max(0, Math.ceil(cuts[k] - 0.5)); i <= Math.min(size - 1, Math.floor(cuts[k + 1] - 0.5)); i++) mask[j * size + i] = 1;
    }
    return mask;
}
/** How many dots of the mask lie on from (i, j) in the direction (dx, dy). */
function run(mask, size, at, step) {
    let count = 0, i = at[0] + step[0], j = at[1] + step[1];
    while (i >= 0 && j >= 0 && i < size && j < size && mask[j * size + i] && count < 40) { count++; i += step[0]; j += step[1]; }
    return count;
}
/**
 * Draws a part over what is there. look: { ramp: five hex colours dark to light, ink?: hex of its outline,
 * lit?: share of the form in the light band (0.24), shade?: share in shadow (0.4), cast?: dots of shadow it drops on what
 * lies under it (2), edge?: false to leave no dark line where it overlaps another part, flat?: one tone only (the base),
 * group?: a name: parts of one group (the joints of one limb) neither line nor shade each other }.
 * The light comes from the upper left. Returns the part's id for marks.
 */
function part(cv, polygon, look) {
    const { size } = cv, id = cv.looks.length, mask = maskOf(cv, polygon), cast = look.cast ?? 2;
    cv.looks.push({ ...look, ramp: look.ramp.map(hexToRgb), ink: hexToRgb(look.ink || look.ramp[0]) });
    // what lies under it: a shadow below and to the right of the new part, and a dark line round it
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const at = j * size + i;
        if (mask[at] || cv.owner[at] < 0 || (look.group && cv.looks[cv.owner[at]].group === look.group)) continue;
        const touching = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => i + dx >= 0 && j + dy >= 0 && i + dx < size && j + dy < size && mask[(j + dy) * size + i + dx]);
        if (touching && look.edge !== false) { cv.paint[at] = -2 - id; continue; }
        for (let k = 1; k <= cast; k++) if (i - k >= 0 && j - k >= 0 && mask[(j - k) * size + i - k]) { cv.tone[at] = Math.max(0, cv.tone[at] - 1); break; }
    }
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const at = j * size + i;
        if (!mask[at]) continue;
        const lit = run(mask, size, [i, j], [-1, -1]), dark = run(mask, size, [i, j], [1, 1]), thick = lit + dark + 1, across = (lit + 0.5) / thick;
        let tone = 2;
        if (!look.flat && thick >= 3) tone = across < (look.lit ?? 0.3) ? 3 : across > 1 - (look.shade ?? 0.42) * 0.3 ? 0 : across > 1 - (look.shade ?? 0.42) ? 1 : 2;
        cv.owner[at] = id; cv.tone[at] = tone; cv.paint[at] = -1;
    }
    return id;
}
/** Limb joints drawn as one form: a strip through the points with the given radii, in one group so the joints do not line each other. */
function chain(cv, points, radii, look) {
    const group = look.group || 'limb' + cv.looks.length;
    let last = -1;
    for (let i = 0; i + 1 < points.length; i++) last = part(cv, limb(points[i], points[i + 1], radii[i], radii[i + 1]), { ...look, group });
    return last;
}
/** A patch inside a part: the dots of the polygon that the part owns take a tone change (by) or a colour of their own (hex). */
function patch(cv, id, polygon, how) {
    const mask = maskOf(cv, polygon), colour = how.hex ? colourIndex(cv, how.hex) : -1;
    for (let at = 0; at < mask.length; at++) {
        if (!mask[at] || cv.owner[at] !== id || cv.paint[at] < -1) continue;
        if (colour >= 0) cv.paint[at] = colour;
        else cv.tone[at] = Math.max(0, Math.min(4, how.to ?? cv.tone[at] + how.by));
    }
}
/** A line one dot wide through the points, on the dots the part owns (or on anything when id is null). */
function stroke(cv, id, points, how) {
    const { size, feet } = cv, colour = how.hex ? colourIndex(cv, how.hex) : -1;
    const plot = (i, j) => {
        if (i < 0 || j < 0 || i >= size || j >= size) return;
        const at = j * size + i;
        if (id !== null && cv.owner[at] !== id) return;
        if (id === null && cv.owner[at] < 0) { cv.owner[at] = how.owner ?? 0; }
        if (colour >= 0) cv.paint[at] = colour; else cv.tone[at] = Math.max(0, Math.min(4, how.to ?? cv.tone[at] + how.by));
    };
    for (let k = 0; k + 1 < points.length; k++) {
        const a = [feet[0] + points[k][0], feet[1] - points[k][1]], b = [feet[0] + points[k + 1][0], feet[1] - points[k + 1][1]];
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))));
        for (let s = 0; s <= steps; s++) plot(Math.floor(a[0] + (b[0] - a[0]) * s / steps), Math.floor(a[1] + (b[1] - a[1]) * s / steps));
    }
}
const palette = [];
function colourIndex(cv, hex) {
    let index = palette.indexOf(hex);
    if (index < 0) { palette.push(hex); index = palette.length - 1; }
    return index;
}
/** One dot of a colour at a figure point, over anything. */
function dot(cv, point, hex) {
    const i = Math.floor(cv.feet[0] + point[0]), j = Math.floor(cv.feet[1] - point[1]);
    if (i < 0 || j < 0 || i >= cv.size || j >= cv.size) return;
    if (cv.owner[j * cv.size + i] < 0) cv.owner[j * cv.size + i] = 0;
    cv.paint[j * cv.size + i] = colourIndex(cv, hex);
}

/** The finished cell as RGBA: tones turned to colours, and one dark dot of outline round the figure. */
function finish(cv) {
    const { size } = cv, rgba = new Uint8Array(size * size * 4);
    const put = (at, c) => rgba.set([c[0], c[1], c[2], 255], at * 4);
    for (let at = 0; at < size * size; at++) {
        if (cv.owner[at] < 0) continue;
        const look = cv.looks[cv.owner[at]];
        if (cv.paint[at] <= -2) put(at, cv.looks[-2 - cv.paint[at]].ink);
        else if (cv.paint[at] >= 0) put(at, hexToRgb(palette[cv.paint[at]]));
        else put(at, look.ramp[cv.tone[at]]);
    }
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const at = j * size + i;
        if (cv.owner[at] >= 0) continue;
        const near = [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]].find(([x, y]) => x >= 0 && y >= 0 && x < size && y < size && cv.owner[y * size + x] >= 0);
        if (near) put(at, cv.looks[cv.owner[near[1] * size + near[0]]].ink);
    }
    return rgba;
}

module.exports = { smooth, oval, limb, placed, sheet, part, chain, patch, stroke, dot, finish };
