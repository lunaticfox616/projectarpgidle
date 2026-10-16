'use strict';
// 옆에서 보는 무대의 소품(바위, 뿌리, 그루터기, 성소의 선돌, 버섯, 수액 꼬투리, 고사리, 풀): 방의 뒤쪽과 가장자리, 앞쪽에 놓아 무대를 채운다.
// 던파의 무대처럼 배경, 뒤쪽 띠, 바닥, 소품, 앞쪽을 겹쳐 그리는 구조(js/canvas-stage-props.js)에서 소품 층의 임시 그림이다:
// 제대로 그린 조각 그림이 오면 같은 이름으로 갈아 끼운다. 한 장씩 서 있는 그림이고 칸은 128, 발 자리는 FEET.
// 이름 순서가 그림의 칸 순서다(data/stage-view.js STAGE_PROPS.names와 같아야 한다).
const S = require('./render.cjs');
const { ramp } = S;

const SIZE = 128, FEET = [64, 116];
const MATS = {
    stone: { ramp: ramp('#74665a', { cool: 16, warm: 10 }) }, stoneDark: { ramp: ramp('#5a4e45', { cool: 14, warm: 8 }) },
    moss: { ramp: ramp('#646a2c', { cool: 22, warm: 16 }) }, root: { ramp: ramp('#6d5845', { cool: 16, warm: 14 }) },
    bark: { ramp: ramp('#5c4735', { cool: 16, warm: 12 }) }, cut: { ramp: ramp('#a58a66', { cool: 14, warm: 10 }) }, cutDark: { ramp: ramp('#7c6247', { cool: 14, warm: 8 }) },
    slate: { ramp: ramp('#65606e', { cool: 16, warm: 10 }) }, carve: { ramp: ramp('#f0c860', { cool: 22, warm: 10 }), glow: true },
    cap: { ramp: ramp('#8fe3c8', { cool: 20, warm: 10 }), glow: true }, stem: { ramp: ramp('#b9c6b4', { cool: 14, warm: 6 }) },
    sap: { ramp: ramp('#d39a2e', { cool: 26, warm: 16 }), gloss: true, glow: true }
};
/** Moss lies on what faces up, above a wavering height. */
const mossAbove = height => p => (p[1] > height + Math.sin(p[0] * 0.45) * 2.2 + Math.sin(p[2] * 0.7 + 1) * 1.6 ? 'moss' : null);
/** A rounded block turned about the upright axis and tipped: rocks are a few of these grown together. */
function chunk(m, at, half, turn, tip, options) {
    m.add(S.moved(S.box(at, half, Math.min(...half) * 0.42), p => S.rotz(S.roty(p, turn, at), tip, at)), 'stone', options);
}

// ---------------------------------------------------------------- 바위
function rock() {
    const m = S.scene(), grown = { group: 'rock', k: 3, paint: mossAbove(15) };
    chunk(m, [0, 10, 0], [20, 11, 13], 0.3, 0.06, grown);
    chunk(m, [-13, 6.5, 5], [11, 7, 9], -0.5, -0.1, grown);
    chunk(m, [14, 6, 3], [10, 6.5, 8], 0.8, 0.14, { group: 'rock', k: 3 });
    return m;
}
function rockSmall() {
    const m = S.scene();
    chunk(m, [-7, 5, 2], [9, 5.5, 7], 0.4, 0.08, { group: 'a', k: 2, paint: mossAbove(8) });
    chunk(m, [9, 3.6, 5], [6, 4, 5], -0.6, -0.1, { group: 'b', k: 2 });
    chunk(m, [1, 2.4, 10], [3.6, 2.6, 3], 0.2, 0, { group: 'c', k: 2 });
    return m;
}
function rockTall() {
    const m = S.scene(), grown = { group: 'rock', k: 3, paint: mossAbove(34) };
    chunk(m, [0, 21, 0], [12, 21, 10], 0.25, 0.1, grown);
    chunk(m, [-11, 7, 5], [9, 7.5, 8], -0.4, -0.08, grown);
    chunk(m, [12, 5, 6], [7, 5, 6], 0.7, 0.12, { group: 'rock', k: 3 });
    return m;
}

// ---------------------------------------------------------------- 뿌리 고리, 그루터기
function rootKnot() {
    const m = S.scene();
    m.add(S.chain([[-26, 0, 2], [-20, 20, 2], [-6, 33, 1], [10, 29, 0], [21, 12, 1], [25, 0, 2]], [6, 5.2, 4.6, 4.2, 4.4, 5.2]), 'root', { group: 'knot', k: 3 });
    m.add(S.chain([[-6, 33, 1], [-1, 22, 6], [6, 10, 9], [13, 0, 11]], [3.2, 2.8, 2.4, 2]), 'root', { group: 'knot', k: 3 });
    m.add(S.chain([[-20, 20, 2], [-28, 12, 7], [-34, 0, 10]], [2.6, 2.2, 1.4]), 'root');
    m.add(S.ellipsoid([-24, 2.4, 6], [8, 3, 6]), 'moss');
    m.add(S.ellipsoid([23, 2, 6], [6, 2.6, 5]), 'moss');
    return m;
}
function stump() {
    const m = S.scene(), rings = p => (p[1] < 22.6 ? null : Math.sin(Math.hypot(p[0], p[2]) * 1.5) > 0.35 ? 'cutDark' : 'cut');
    m.add(S.cylinder([0, 12, 0], 13, 12, 1.6), 'bark', { group: 'stump', k: 4, paint: rings });
    m.add(S.limb([-8, 22, -4], [-10, 37, -5], 4, 0.8), 'bark', { group: 'stump', k: 3 });
    m.add(S.limb([-2, 22, -8], [-1, 31, -9], 3, 0.6), 'bark', { group: 'stump', k: 3 });
    for (const [x, z, reach] of [[10, 9, 1], [-11, 8, 1.1], [14, -2, 0.8], [-13, -4, 0.9], [1, 12, 1.2]]) {
        m.add(S.chain([[x * 0.7, 8, z * 0.7], [x * (1 + 0.5 * reach), 3.4, z * (1 + 0.5 * reach)], [x * (1 + 1.1 * reach), 0.6, z * (1 + 1.1 * reach)]], [5, 3.4, 1.4]), 'bark', { group: 'stump', k: 4 });
    }
    m.add(S.ellipsoid([9, 23.4, 5], [5, 1.2, 4]), 'moss');
    return m;
}

// ---------------------------------------------------------------- 성소의 선돌
/** The sanctuary's standing stones carry a carved spiral that still holds a little light. */
function spiral(p, centre) {
    if (p[2] < 3.5) return null;
    const dx = p[0] - centre[0], dy = p[1] - centre[1], r = Math.hypot(dx, dy);
    return r < 8.5 && Math.sin(r * 1.7 - Math.atan2(dy, dx)) > 0.72 ? 'carve' : null;
}
function shrineStone() {
    const m = S.scene(), dress = p => spiral(p, [0, 33]) || mossAbove(52)(p) || (p[1] < 7 + Math.sin(p[0] * 0.8) * 2 ? 'moss' : null);
    m.add(S.moved(S.box([0, 28, 0], [11, 28, 6.4], 4.4), p => S.rotz(p, 0.05, [0, 0, 0])), 'slate', { group: 'stone', k: 3, paint: dress });
    m.add(S.ellipsoid([0.6, 55, 0], [8.5, 6, 5.6]), 'slate', { group: 'stone', k: 4, paint: mossAbove(52) });
    chunk(m, [-15, 3.6, 6], [6, 4, 5], 0.5, 0.1, { group: 'rubble', k: 2 });
    chunk(m, [14, 2.8, 8], [4.6, 3, 4], -0.4, -0.1, { group: 'rubble2', k: 2 });
    return m;
}
function shrineFallen() {
    const m = S.scene(), lie = p => S.rotz(S.roty(p, 0.3, [0, 7, 0]), 0.07, [0, 7, 0]);
    m.add(S.moved(S.box([-4, 7.4, 0], [25, 7.4, 7], 4), lie), 'slate', { paint: mossAbove(11.5) });
    chunk(m, [26, 5, 6], [7, 5.4, 6], 0.7, 0.2, { group: 'piece', k: 2 });
    chunk(m, [-30, 3, 9], [4.6, 3.2, 4], -0.3, 0, { group: 'piece2', k: 2 });
    return m;
}

// ---------------------------------------------------------------- 빛나는 버섯, 수액 꼬투리
function glowcaps() {
    const m = S.scene();
    for (const [x, z, tall, size] of [[-9, 2, 19, 7], [3, -2, 26, 8.5], [12, 4, 13, 5.5], [-2, 8, 9, 4], [-17, 6, 7, 3.4]]) {
        m.add(S.chain([[x, 0, z], [x + 0.8, tall * 0.55, z], [x, tall, z]], [1.8, 1.5, 1.3]), 'stem');
        m.add(S.above(S.ellipsoid([x, tall, z], [size, size * 0.74, size]), tall - 0.6), 'cap');
    }
    m.add(S.ellipsoid([0, 1.6, 3], [16, 2.2, 8]), 'moss');
    return m;
}
function sapPod() {
    const m = S.scene();
    m.add(S.chain([[-11, 0, 0], [-10, 15, 0], [-3, 26, 0], [7, 27, 1], [11, 20, 2]], [4.4, 3.6, 3, 2.6, 2]), 'root', { group: 'stalk', k: 3 });
    m.add(S.ellipsoid([11, 11, 3], [7, 10, 7]), 'sap');
    m.add(S.sphere([11, 0.6, 4], 2), 'sap');
    m.add(S.chain([[-11, 0, 0], [-19, 3, 5], [-25, 0.6, 8]], [3, 2.2, 1.2]), 'root');
    return m;
}

// ---------------------------------------------------------------- 고사리와 풀: 입체가 아니라 붓질로 찍는다
const GREEN = { dark: [44, 50, 26], mid: [86, 96, 43], light: [128, 138, 62] };
/** 0..1, the same every time. */
function rand(a, b) {
    let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function dot(cell, x, y, rgb) {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    cell.set([rgb[0], rgb[1], rgb[2], 255], (Math.round(y) * SIZE + Math.round(x)) * 4);
}
function span(cell, x, y, width, rgb) { for (let i = 0; i < width; i++) dot(cell, Math.round(x) + i, Math.round(y), rgb); }
/** Fronds fanning from the feet: a dark rib and leaflets that shorten toward the drooping tip. */
function fern(size, seed) {
    const cell = new Uint8Array(SIZE * SIZE * 4), fronds = 6 + Math.floor(rand(seed, 2) * 3), [x, y] = FEET;
    for (let f = 0; f < fronds; f++) {
        const spread = (f / (fronds - 1) - 0.5) * 2.1, length = Math.round(size * (0.7 + rand(seed, f + 10) * 0.4));
        for (let step = 0; step < length; step++) {
            const t = step / length, px = x + Math.sin(spread) * step * 0.8 + spread * t * t * size * 0.22, py = y - Math.cos(spread) * step * 0.9 + t * t * size * 0.2;
            const leaf = Math.max(1, Math.round((1 - t * 0.8) * (size / 7) * Math.min(1, t * 4)));
            span(cell, px - leaf, py - 1, leaf * 2 + 1, step % 3 === 0 ? GREEN.light : step % 3 === 1 ? GREEN.mid : GREEN.dark);
            dot(cell, px, py, GREEN.dark);
        }
    }
    return cell;
}
/** A thick clump of tall grass. */
function grass(seed) {
    const cell = new Uint8Array(SIZE * SIZE * 4), [x, y] = FEET;
    for (let blade = 0; blade < 15; blade++) {
        const lean = (blade - 7) * 0.9 + (rand(seed, blade) - 0.5) * 2, tall = 7 + Math.floor(rand(seed, blade + 20) * 11);
        const rgb = rand(seed, blade + 40) > 0.6 ? GREEN.light : rand(seed, blade + 60) > 0.5 ? GREEN.mid : GREEN.dark;
        for (let step = 0; step < tall; step++) dot(cell, x + lean * 1.3 + lean * step * 0.12, y - step, rgb);
    }
    span(cell, x - 12, y + 1, 24, GREEN.dark);
    return cell;
}

/** name → how its cell is drawn: build() for a solid model, paint() for a brushed one. The order is the order of the cells. */
const props = [
    ['rock', { build: rock }], ['rockSmall', { build: rockSmall }], ['rockTall', { build: rockTall }], ['rootKnot', { build: rootKnot }], ['stump', { build: stump }],
    ['shrineStone', { build: shrineStone }], ['shrineFallen', { build: shrineFallen }], ['glowcaps', { build: glowcaps }], ['sapPod', { build: sapPod }],
    ['fernSmall', { paint: () => fern(26, 3) }], ['fern', { paint: () => fern(38, 7) }], ['fernBig', { paint: () => fern(52, 11) }], ['grass', { paint: () => grass(5) }]
].map(([name, how]) => ({ name, mats: MATS, ...how }));

module.exports = { themes: { root: props }, SIZE, FEET };
