'use strict';
/* 소품: 손으로 찍은 도트 그림과 코드로 그리는 물건. (x, y) = 물건이 바닥에 닿는 아래 가운데. lights에 빛을 더한다. */
const { drawTube, blob, contactShadow, stamp, densify } = require('./paint.cjs');
const { roomBox } = require('./terrain.cjs');

const ART = {
    lantern: `
....kkk....
..kk454kk..
.k4455443k.
kkkkkkkkkkk
.k3kzzzk2k.
.k3kyzyk2k.
.k3kxyxk2k.
.kkkkkkkkk.
..k44432k..
...k432k...
...k432k...
...k432k...
...k332k...
..k43322k..
.k4433222k.
.kkkkkkkkk.`,
    shrooms: `
..kkk......
.kyzyk.kkk.
kyzzyyk.yxk
kxyyyxkkyxk
.kkxkk.kkkk
..kxk...kxk
..kwk...kwk
..kkk...kkk`,
    fern: `
...i...i...
.i.hi.ih.i.
.hi.hih.ih.
..hhgihgh..
.hghggghgh.
hggfgggfggh
.ffgfffgff.
..kfffffk..`,
    flowers: `
.y...z.
yxy.zyz
.g.y.g.
.gyxyg.
..ggg..`,
    blossom: `
.s...t.
srs.tst
.m.s.m.
.msrsm.
..mmm..`,
    crystal: `
...k...
..ksk..
.kstsk.
.ksttk.
kqsttsk
kqsstsk
.kqssk.
..kkk..`,
    candles: `
....z......
....y...z..
..z.k5k.y..
..y.k4kk5k.
.k5kk4kk4k.
.k4kk4kk3k.
.k3kk3kk3k.
kk3kk3kk3kk
k222222222k
.kkkkkkkkk.`,
    bones: `
k5k..kk.
.k54k45k
..k44kk.
.k5kk...`,
    skull: `
.kkk.
k545k
kk4kk
.k3k.`,
    grave: `
..kkk..
.k454k.
k45432k
k4k5k2k
k45532k
k4k4k2k
k43332k
k43222k
k32221k
kkkkkkk`,
    leaves: `
..MN.L..
.LMFNFL.
fLFLMLFL
.fLffLf.`
};

function lantern(cv, x, y, th, lights) { contactShadow(cv, x, y, 5); stamp(cv, ART.lantern, x, y); lights.push([x, y - 10, 26, 'warm']); }
function shrooms(cv, x, y, th, lights) { stamp(cv, ART.shrooms, x, y, cv.rng.random() < 0.5); lights.push([x, y - 3, 14, 'warm']); }
function mushrooms(cv, x, y, th, lights) { stamp(cv, ART.shrooms.replace(/[xyzw]/g, c => ({ x: 'r', y: 's', z: 't', w: 'q' })[c]), x, y, cv.rng.random() < 0.5); lights.push([x, y - 3, 16, 'teal']); }
function crystals(cv, x, y, th, lights) { stamp(cv, ART.crystal, x, y); stamp(cv, ART.crystal, x + 5, y + 1); lights.push([x + 2, y - 4, 18, 'teal']); }
function candles(cv, x, y, th, lights) { stamp(cv, ART.candles, x, y); lights.push([x, y - 6, 20, 'warm']); }
function bones(cv, x, y) { stamp(cv, ART.bones, x, y, cv.rng.random() < 0.5); }
function skull(cv, x, y) { stamp(cv, ART.skull, x, y); stamp(cv, ART.bones, x + 6, y + 1, true); }
function grave(cv, x, y, th, lights) { contactShadow(cv, x, y, 4); stamp(cv, ART.grave, x, y); if (cv.rng.random() < 0.5) candles(cv, x + 8, y + 2, th, lights); }
function leaves(cv, x, y) { stamp(cv, ART.leaves, x, y, cv.rng.random() < 0.5); stamp(cv, ART.leaves, x + cv.rng.int(-6, 7), y + cv.rng.int(2, 5)); }
function fern(cv, x, y) { stamp(cv, ART.fern, x, y); }
function flowers(cv, x, y) { stamp(cv, ART.flowers, x, y); }
function blossom(cv, x, y) { stamp(cv, ART.blossom, x, y); stamp(cv, ART.blossom, x + 4, y + 2, true); }

function brazier(cv, x, y, th, lights) {
    for (const side of [-1, 0, 1]) drawTube(cv, [[x + side * 6, y], [x + side * 3, y - 8], [x + side, y - 14]], 2, { ramp: 'stone', base: 2, bark: false });
    for (let r = 0; r < 6; r++) {
        const half = 9 - Math.floor(r / 2);
        for (let dx = -half; dx <= half; dx++) cv.put(x + dx, y - 14 - r, Math.abs(dx) === half || r === 5 ? cv.pal.ink : cv.col('stone', r < 2 ? 4 : dx < 2 ? 3 : 2));
    }
    ['....h....', '...hyh...', '..yyyhy..', '.wyhhhyw.', 'wwyyhyyww', '.wwwyyww.'].forEach((row, r) => {
        [...row].forEach((ch, i) => { if (ch !== '.') cv.put(x - 4 + i, y - 25 + r, cv.col('warm', { w: 2, y: 3, h: 4 }[ch])); });
    });
    contactShadow(cv, x, y + 1, 7);
    lights.push([x, y - 18, 30, 'warm']);
}

function pillar(cv, x, y, th, lights, o = {}) {
    const height = o.height || cv.rng.int(14, 26), w = 9, broken = o.broken ?? true, ramp = o.ramp || 'stone', half = Math.floor(w / 2);
    contactShadow(cv, x + 1, y + 1, half + 3);
    for (let yy = y - 2; yy <= y; yy++) for (let xx = x - half - 2; xx <= x + half + 2; xx++) {
        const rim = xx === x - half - 2 || xx === x + half + 2 || yy === y;
        cv.put(xx, yy, rim ? cv.pal.ink : cv.col(ramp, xx < x ? 3 : 2));
    }
    const jag = [0, 2, 1, 3, 4, 2, 1, 0, 2];
    for (let k = 0; k < w; k++) {
        const xx = x - half + k, top = y - 2 - height + (broken ? jag[k] : 0);
        for (let yy = top; yy < y - 2; yy++) {
            const rel = k / (w - 1);
            let c = xx === x - half || xx === x + half || yy === top ? cv.pal.ink : cv.col(ramp, rel < 0.35 ? 4 : rel < 0.7 ? 3 : 2);
            if (c !== cv.pal.ink && (yy - top) % 6 === 5) c = cv.col(ramp, 1);
            cv.put(xx, yy, c);
        }
        if (broken) cv.put(xx, top + 1, cv.col(ramp, k < 3 ? 5 : 3));
    }
    if (th.pillarRoots) drawTube(cv, [[x - 5, y - 1], [x - 2, y - height * 0.4], [x + 3, y - height * 0.7], [x + 1, y - height + 2]], 3, { base: 2 });
    for (let k = 0; k < 4; k++) cv.put(x - 2 + k % 3, y - 3 - k, cv.col('moss', 2));
}

/** 두건 쓴 석상: 받침 + 긴 옷 + 머리. */
function statue(cv, x, y, th, lights, o = {}) {
    const ramp = o.ramp || 'stone', robeH = 16;
    contactShadow(cv, x + 1, y + 1, 8);
    for (let yy = y - 5; yy <= y; yy++) for (let xx = x - 7; xx <= x + 7; xx++) {
        cv.put(xx, yy, xx === x - 7 || xx === x + 7 || yy === y - 5 || yy === y ? cv.pal.ink : cv.col(ramp, yy === y - 4 ? 4 : xx < x ? 3 : 2));
    }
    for (let k = 0; k < robeH; k++) {
        const yy = y - 6 - k, half = 5 - Math.floor(k * 2 / robeH);
        for (let xx = x - half - 1; xx <= x + half + 1; xx++) {
            if (o.broken && yy < y - 6 - robeH + 5 + Math.floor((xx - x) / 2)) continue;
            const rel = (xx - x) / (half + 0.5);
            let c = Math.abs(rel) > 1 ? cv.pal.ink : cv.col(ramp, rel < -0.3 ? 4 : rel < 0.35 ? 3 : 2);
            if (Math.abs(rel) <= 1 && (xx - x) % 3 === 0 && k < robeH - 3 && rel > -0.5) c = cv.col(ramp, rel < 0.35 ? 2 : 1);
            cv.put(xx, yy, c);
        }
    }
    if (!o.broken) {
        const hy = y - 6 - robeH - 2;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
            const d = Math.hypot(dx, dy * 1.1);
            if (d <= 2.6) cv.put(x + dx, hy + dy, cv.col(ramp, dx + dy < 0 ? 4 : 2));
            else if (d <= 3.4) cv.put(x + dx, hy + dy, cv.pal.ink);
        }
        cv.put(x, hy + 1, cv.col(ramp, 1));
    }
    if (th.pillarRoots) drawTube(cv, [[x + 6, y - 2], [x + 3, y - 10], [x - 3, y - 15]], 2, { base: 2 });
    for (let k = 0; k < 3; k++) cv.put(x - 3 + k, y - 6, cv.col('moss', 2));
}

function urn(cv, x, y) {
    contactShadow(cv, x, y + 1, 5);
    blob(cv, x, y - 5, 4.5, 5, 'stone', { base: 3 });
    for (let dx = -3; dx <= 3; dx++) { cv.put(x + dx, y - 11, cv.pal.ink); cv.put(x + dx, y - 10, cv.col('stone', dx < 1 ? 4 : 3)); }
    blob(cv, x, y - 13, 3, 1.6, 'leaf', { base: 3 });
}

function crate(cv, x, y) {
    contactShadow(cv, x, y + 1, 6);
    for (let yy = y - 9; yy <= y; yy++) for (let xx = x - 5; xx <= x + 5; xx++) {
        const rim = xx === x - 5 || xx === x + 5 || yy === y - 9 || yy === y, band = (yy - y) % 3 === 0;
        cv.put(xx, yy, rim ? cv.pal.ink : band ? cv.col('wood', 1) : cv.col('wood', yy < y - 6 ? 3 : 2));
    }
}

function rock(cv, x, y, th, lights, big = false) {
    const [rx, ry] = big ? [8, 5] : [cv.rng.int(3, 5) + 1, cv.rng.int(3, 5)], rough = cv.noise(2.5, 5), cy = y - ry;
    contactShadow(cv, x, y, rx);
    for (let yy = cy - ry - 1; yy <= cy + ry + 1; yy++) for (let xx = x - rx - 1; xx <= x + rx + 1; xx++) {
        if (!cv.inside(xx, yy)) continue;
        const v = ((xx - x) / rx) ** 2 + ((yy - cy) / ry) ** 2 + (rough[yy * cv.w + xx] - 0.5) * 0.45;
        if (v <= 1) {
            const light = -(xx - x) / rx * 0.5 - (yy - cy) / ry, band = 3 + (light > 0.4) + (light > 0.95) - (light < -0.25) - (light < -0.75);
            const mossy = yy - cy < -ry * 0.3 && rough[yy * cv.w + xx] > 0.42 && th.mossyRocks !== false;
            cv.put(xx, yy, mossy ? cv.col('moss', 2 + (light > 0.8)) : cv.col('stone', band));
        } else if (v <= 1.28) cv.put(xx, yy, cv.pal.ink);
    }
}

function twigs(cv, x, y) {
    drawTube(cv, [[x - 7, y], [x, y - 2], [x + 6, y - 1]], 2, { base: 2 });
    drawTube(cv, [[x - 1, y - 2], [x + 2, y - 6]], 1.5, { base: 2 });
}

function stump(cv, x, y, th, lights, r = 14) {
    const ry = Math.floor(r * 0.55), trunk = Math.floor(r * 0.9), cy = y - trunk;
    for (let s = 0; s < 8; s++) {
        const a = s / 8 * Math.PI * 2 + 0.3;
        if (Math.sin(a) < -0.5) continue;
        const pts = [];
        for (let t = 0; t <= 1.0001; t += 1 / 13) pts.push([x + Math.cos(a) * r * (0.7 + t * 0.9), cy + trunk + Math.sin(a) * ry * (0.6 + t * 1.4) - t * 2]);
        drawTube(cv, pts, 4, { base: 2, taper: 0.6 });
    }
    for (let yy = cy; yy <= cy + trunk; yy++) for (let xx = x - r; xx <= x + r; xx++) {
        const rel = (xx - x) / r;
        let c = Math.abs(rel) > 0.93 ? cv.pal.ink : cv.col('wood', rel < -0.35 ? 3 : rel < 0.4 ? 2 : 1);
        if (Math.abs(rel) <= 0.93 && (xx * 5 + Math.floor(yy / 3)) % 7 === 0) c = cv.col('wood', rel < 0.4 ? 1 : 0);
        cv.put(xx, yy, c);
    }
    for (let xx = x - r; xx <= x + r; xx++) cv.put(xx, cy + trunk + 1, cv.pal.ink);
    for (let yy = cy - ry - 1; yy <= cy + ry + 1; yy++) for (let xx = x - r - 1; xx <= x + r + 1; xx++) {
        const v = ((xx - x) / r) ** 2 + ((yy - cy) / ry) ** 2;
        if (v <= 1) cv.put(xx, yy, v > 0.8 ? cv.col('wood', 2) : cv.col('wood', Math.floor(Math.sqrt(v) * 5) % 2 === 0 ? 4 : 3));
        else if (v <= 1.18) cv.put(xx, yy, cv.pal.ink);
    }
}

function cocoon(cv, x, y, th, lights) {
    for (let a = -2.6; a <= -0.5; a += 0.525) for (let i = 0; i < 34; i++) cv.put(x + Math.cos(a) * i, y - 12 + Math.sin(a) * i, cv.col('stone', i % 4 ? 5 : 4));
    blob(cv, x, y - 12, 8, 12, 'teal', { base: 2 });
    for (let k = -9; k < 10; k += 3) for (let dx = -7; dx < 8; dx++) if ((dx / 8) ** 2 + (k / 12) ** 2 < 0.9) cv.put(x + dx, y - 12 + k + Math.floor(dx * 0.3), cv.col('teal', 3));
    contactShadow(cv, x, y + 1, 7);
    lights.push([x, y - 12, 34, 'teal']);
}

function halo(cv, x, y, lights) {
    for (let s = 0; s < 30; s++) { const a = s / 30 * Math.PI * 2; cv.put(x + Math.cos(a) * 5, y + Math.sin(a) * 2, cv.col('warm', Math.sin(a) < 0 ? 3 : 2)); }
    lights.push([x, y + 10, 22, 'warm']);
}

const PROPS = {
    lantern, brazier, shrooms, mushrooms, crystals, candles, bones, skull, grave, leaves, fern, flowers, blossom, urn, crate, twigs, stump, cocoon,
    pillar: (cv, x, y, th, l) => pillar(cv, x, y, th, l),
    statue: (cv, x, y, th, l) => statue(cv, x, y, th, l),
    broken_statue: (cv, x, y, th, l) => statue(cv, x, y, th, l, { broken: true }),
    gold_statue: (cv, x, y, th, l) => { statue(cv, x, y, th, l); halo(cv, x, y - 28, l); },
    rock: (cv, x, y, th, l) => rock(cv, x, y, th, l),
    bigrock: (cv, x, y, th, l) => rock(cv, x, y, th, l, true)
};

module.exports = { ART, PROPS, densify, roomBox };
