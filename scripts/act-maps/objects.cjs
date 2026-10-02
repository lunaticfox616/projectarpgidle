'use strict';
/* 소품(그린 화풍). 모두 왼쪽 위에서 빛을 받고, 제 가장 어두운 색으로 외곽선, 바닥에 접지 그림자.
 * SIZE: 밑동 기준 반너비와 위로 차지하는 높이(배치가 벽 윗면을 덮지 않게 할 때 쓴다). */
const { P, TORCH, COOL, GREEN, VIOLET } = require('./pal.cjs');
const { sprite, shadow, lump, column } = require('./sprite.cjs');
const plants = require('./plants.cjs');

const FLAME = ['....a....', '...aba...', '..abcba..', '..bcdcb..', '.abcddcb.', '.bcdeedcb', '.bcdeedcb', '..cdeedc.', '...cddc..'];
const FIRE_KEY = () => ({ a: P.fire[0], b: P.fire[1], c: P.fire[2], d: P.fire[3], e: P.fire[4] });
/** 세발 받침 쇠 화로: 밝은 기둥, 테가 밝은 그릇, 흰 심지가 있는 큰 불꽃, 불똥 둘. */
function torch(cv, x, y, lights) {
    lights.push([x, y - 18, 48, TORCH, 0.34]);
    shadow(cv, x + 3, y + 1, 8, 2.4);
    for (let yy = y - 14; yy <= y - 2; yy++) { cv.put(x - 1, yy, P.iron[0]); cv.put(x, yy, P.iron[3]); cv.put(x + 1, yy, P.iron[1]); cv.put(x + 2, yy, P.iron[0]); }
    sprite(cv, ['..o..o..', '.oi..io.', 'oi....io', 'o......o'], x + 1, y + 1, { o: P.iron[0], i: P.iron[2] });
    sprite(cv, ['ooooooooo', 'oiIIIIIio', '.oIIIIIo.', '..ooooo..'], x + 1, y - 13, { o: P.iron[0], I: P.iron[2], i: P.iron[3] });
    sprite(cv, FLAME, x + 1, y - 15, FIRE_KEY());
    cv.put(x - 2, y - 27, P.fire[2]); cv.put(x + 4, y - 29, P.fire[3]);
}
/** 돌 접시 위 높이가 다른 초 세 자루, 흘러내린 촛농, 작은 불꽃. */
function candles(cv, x, y, lights) {
    lights.push([x, y - 5, 24, TORCH, 0.22]);
    shadow(cv, x + 1, y + 1, 7, 2, 0.35);
    sprite(cv, ['.ooooooooo.', 'oSSSSSSSSSo', 'ossssssssso', '.ooooooooo.'], x, y + 2, { o: P.stone[0], S: P.stone[4], s: P.stone[2] });
    for (const [dx, hgt, run] of [[-3, 5, 2], [0, 8, 4], [3, 4, 1]]) {
        const bx = x + dx, top = y - hgt;
        for (let yy = top; yy <= y; yy++) { cv.put(bx - 1, yy, P.wax[3]); cv.put(bx, yy, P.wax[1]); }
        cv.put(bx - 1, top, P.wax[2]); cv.put(bx, top, P.wax[2]);
        for (let k = 1; k <= run; k++) cv.put(bx + 1, top + k, P.wax[2]);
        cv.put(bx - 1, top - 1, P.ink[0]);
        cv.put(bx - 1, top - 2, P.fire[4]); cv.put(bx - 1, top - 3, P.fire[3]); cv.put(bx, top - 3, P.fire[1]); cv.put(bx - 1, top - 4, P.fire[2]);
    }
}
/** 석등(중정): 받침, 기둥, 불 켜진 창이 있는 등집, 지붕. */
function lantern(cv, x, y, lights) {
    lights.push([x, y - 12, 34, TORCH, 0.26]);
    shadow(cv, x + 2, y + 1, 7, 2.2);
    const S = P.stone;
    sprite(cv, ['..ooooooo..', '.oLLLLLLLo.', 'ooooooooooo', '..oLwfwLo..', '..oLfYfLo..', '..oLwfwLo..', '..ooooooo..', '....oLo....', '....oLo....', '....odo....', '...oLLdo...', '.oLLLLLLdo.', '.ooooooooo.'],
        x, y + 1, { o: S[0], L: S[4], d: S[2], w: P.fire[2], f: P.fire[3], Y: P.fire[4] });
}
function urn(cv, x, y) {
    shadow(cv, x + 2, y + 1, 6, 2);
    const W = P.stone;
    sprite(cv, ['..ooooo..', '.oLLLLdo.', '..oLLdo..', '.oLLLLdo.', 'oLLlLLLdo', 'oLlLLLLdo', 'oLLLLLddo', '.oLLLddo.', '..ooooo..'], x, y + 1, { o: W[0], L: W[4], l: W[5], d: W[2] });
    if (P.hedge) sprite(cv, ['.g.G.', 'gGgGg', '.ggg.'], x, y - 8, { g: P.hedge[3], G: P.hedge[5] });
}
function statue(cv, x, y) {
    shadow(cv, x + 3, y + 1, 8, 2.4);
    const S = P.stone;
    sprite(cv, ['...ooo...', '..oLLdo..', '..oLLdo..', '...odo...', '.ooLLLoo.', 'oLLLLLLdo', 'oLoLLLodo', 'oLooLLodo', '..oLLLdo.', '..oLLLdo.', '..oLodLo.', '..oLodLo.', '.oooooooo', 'oLLLLLLLdo', 'oddddddddo', 'oooooooooo'],
        x, y + 1, { o: S[0], L: S[4], d: S[2] });
}
/** 화분에 심은 동그랗게 다듬은 나무. */
function topiary(cv, x, y) {
    shadow(cv, x + 2, y + 1, 6, 2);
    sprite(cv, ['.oooo.', 'oLLLdo', '.oood.'], x, y + 1, { o: P.stone[0], L: P.stone[4], d: P.stone[2] });
    lump(cv, x, y - 8, 5, 5, P.hedge, x + y);
}
function bench(cv, x, y) {
    shadow(cv, x + 2, y + 1, 10, 2);
    const S = P.stone;
    sprite(cv, ['oooooooooooooooo', 'oLLLLLLLLLLLLLLo', 'oddddddddddddddo', '.oLo........oLo.', '.odo........odo.', '.ooo........ooo.'], x, y + 1, { o: S[0], L: S[5], d: S[2] });
}
const SKULL = ['..ooooo..', '.oWWWWWo.', 'oWWwwwWwo', 'oWkkWkkwo', 'oWkkWkkwo', '.oWWnWwo.', '..oWwWo..', '..owowo..', '...ooo...'];
function skulls(cv, x, y) {
    shadow(cv, x + 2, y + 1, 9, 2.2, 0.38);
    sprite(cv, ['..oo....oo', '.oBbo..obBo', 'oBbbboobbbo', '.oo....oo.'], x + 3, y + 1, { o: P.bone[0], B: P.bone[4], b: P.bone[3] });
    sprite(cv, SKULL, x - 2, y, { o: P.bone[0], W: P.bone[3], w: P.bone[2], k: P.ink[0], n: P.bone[1] });
}
/** 구석 거미줄. mask가 있으면 그 자리(바닥)에만 그린다. */
function web(cv, x, y, sx, sy, mask = null) {
    const c = [P.web[0], 0.42], c2 = [P.web[0], 0.26];
    const dot = (px, py, col) => { if (cv.inside(px, py) && (!mask || mask[py * cv.w + px])) sprite(cv, ['a'], px, py + 1, { a: col }); };
    for (let k = 0; k < 16; k++) { dot(x + sx * k, y, c); dot(x, y + sy * k, c); if (k < 12) dot(x + sx * k, y + sy * k, c); }
    for (const r of [5, 9, 13]) for (let k = 1; k < r; k++) dot(x + sx * k, y + sy * (r - k) - Math.round(Math.sin(k / r * Math.PI) * 1.2) * sy, c2);
}
function planks(cv, x, y) {
    shadow(cv, x + 2, y + 2, 10, 2.5, 0.35);
    const row = len => 'o' + 'L'.repeat(len) + 'o';
    sprite(cv, ['.' + 'o'.repeat(15), row(14) + 'o', 'oDDDDnDDDDDDnDDo', '.' + 'o'.repeat(15)], x, y - 2, { o: P.wood[0], L: P.wood[4], D: P.wood[2], n: P.iron[3] });
    sprite(cv, ['....oooooo', '..ooLLLLLLo', 'ooLLLLDDDo', 'oDDDnDDoo.', '.ooooooo..'], x + 4, y + 3, { o: P.wood[0], L: P.wood[3], D: P.wood[1], n: P.iron[3] });
}
function crate(cv, x, y) {
    shadow(cv, x + 3, y + 1, 8, 2.2);
    const W = P.wood;
    sprite(cv, ['oooooooooooo', 'oLLLLLLLLLLo', 'oLdddddddddo', 'oooooooooooo', 'oLdLLLLLLdLo', 'oLLdLLLLdLLo', 'oLLLdLLdLLLo', 'oLLLLddLLLLo', 'oLLLdLLdLLLo', 'oLLdLLLLdLLo', 'oddddddddddo', 'oooooooooooo'],
        x, y + 1, { o: W[0], L: W[3], d: W[1] });
}
function barrel(cv, x, y) {
    shadow(cv, x + 3, y + 1, 7, 2.2);
    column(cv, x, y - 11, y, 5, P.wood);
    for (const yy of [y - 9, y - 2]) for (let xx = x - 4; xx <= x + 4; xx++) cv.put(xx, yy, P.iron[2]);
    sprite(cv, ['.ooooooooo.', 'oLLLLLLLLLo', '.ooooooooo.'], x, y - 10, { o: P.wood[0], L: P.wood[4] });
}
function potions(cv, x, y, lights) {
    lights.push([x, y - 4, 20, GREEN, 0.2]);
    shadow(cv, x + 1, y + 1, 7, 1.8, 0.35);
    const G = P.glow;
    sprite(cv, ['..o.....o..', '.oko...oko.', '.oGo...oGo.', 'oGgGo.oGgGo', 'oGGGo.oGGGo', '.ooo...ooo.'], x - 2, y + 1, { o: P.ink[0], k: P.wood[2], G: G[2], g: G[4] });
    sprite(cv, ['.o.', 'oko', 'oGo', 'ogo', '.o.'], x + 5, y + 1, { o: P.ink[0], k: P.wood[2], G: G[3], g: G[4] });
}
const SHROOM = ['.ooo.', 'oHhho', 'ohhdo', '.oso.', '.oso.'];
function shrooms(cv, x, y, lights) {
    lights.push([x, y - 3, 18, COOL, 0.2]);
    shadow(cv, x, y + 1, 6, 1.6, 0.3);
    const k = { o: P.glow[0], H: P.glow[4], h: P.glow[3], d: P.glow[2], s: P.bone[2] };
    sprite(cv, SHROOM, x - 2, y + 1, k);
    sprite(cv, ['.oo.', 'oHho', '.so.'], x + 3, y + 1, k);
    sprite(cv, ['.oo.', 'ohdo', '.so.', '.so.'], x - 6, y + 1, k);
}
const GRAVE = ['...oooooo...', '..oLLLLLLo..', '.oLlLLLLLdo.', '.olLLLLLLdo.', '.olLrrrrLdo.', '.olLLLLLLdo.', '.olLrrrLLdo.', '.olLLLLLLdo.', '.olLLLcLLdo.', '.olLLLcLLdo.', 'oMMMMMMMMMMo', 'oooooooooooo'];
function grave(cv, x, y) {
    shadow(cv, x + 3, y + 1, 9, 2.4, 0.42);
    sprite(cv, GRAVE, x, y + 1, { o: P.stone[0], L: P.stone[4], l: P.stone[5], d: P.stone[2], r: P.stone[2], c: P.stone[1], M: P.moss[3] });
}
function boulder(cv, x, y, r) {
    shadow(cv, x + r * 0.4, y + 1, r * 1.2, r * 0.42, 0.45);
    lump(cv, x, y - r * 0.6, r, r * 0.72, P.stone.slice(0, 7), x + y);
    for (let k = 0; k < r; k++) { const mx = x - r * 0.5 + k, my = y - r * 1.2 + Math.abs(k - r / 2) * 0.35; if (cv.rng.random() < 0.7) cv.put(mx, my, P.moss[k % 2 ? 4 : 3]); }
}
function rubble(cv, x, y) {
    shadow(cv, x + 2, y + 1, 9, 2.2, 0.38);
    for (const [dx, dy, r] of [[-4, 0, 3], [3, 1, 4], [0, -2, 3], [6, -1, 2], [-6, 2, 2]]) lump(cv, x + dx, y + dy - r * 0.5, r, r * 0.7, P.stone.slice(0, 7), x + dx * 3);
}
function sapCrystal(cv, x, y, lights) {
    lights.push([x, y - 6, 24, VIOLET, 0.24]);
    shadow(cv, x + 2, y + 1, 6, 1.8, 0.35);
    const G = P.glow;
    sprite(cv, ['...o....', '..oho...', '..oHGo.o', '.oHhGooho', '.oHhGoHGo', 'oHhGGoHGo', 'oHGGGooo.', '.ooooo...'], x, y + 1, { o: G[0], H: G[4], h: G[3], G: G[2] });
}
/** 금 갓을 쓴 흑요석 첨탑, 빛나는 이음매. */
function spire(cv, x, y, lights) {
    lights.push([x, y - 20, 28, COOL, 0.16]);
    shadow(cv, x + 4, y + 1, 7, 2.2);
    const S = P.stone;
    for (let yy = y - 26; yy <= y; yy++) {
        const half = Math.max(1, Math.round((yy - (y - 26)) / 26 * 4));
        for (let xx = x - half; xx <= x + half; xx++) cv.put(xx, yy, xx === x - half || xx === x + half ? S[0] : xx < x ? S[4] : S[2]);
        if (yy % 5 === 0) cv.put(x, yy, P.glow[3]);
    }
    sprite(cv, ['.g.', 'gGg'], x, y - 25, { g: P.gold[2], G: P.gold[4] });
}
function goldStatue(cv, x, y) {
    statue(cv, x, y);
    for (let yy = y - 15; yy <= y - 3; yy++) for (let xx = x - 4; xx <= x + 4; xx++) {
        if (!cv.inside(xx, yy)) continue;
        const i = yy * cv.w + xx;
        if (cv.px[i] === P.stone[4]) cv.px[i] = P.gold[3]; else if (cv.px[i] === P.stone[2]) cv.px[i] = P.gold[1];
    }
}
function brazierBlue(cv, x, y, lights) {
    torch(cv, x, y, []);
    lights.push([x, y - 18, 40, COOL, 0.16]);
    sprite(cv, FLAME, x + 1, y - 15, { a: P.glow[0], b: P.glow[1], c: P.glow[2], d: P.glow[3], e: P.glow[4] });
}
/** 검은 물웅덩이(5액트): 돌 테, 안쪽은 거의 검게, 물빛 몇 점. */
function blackPool(cv, g, x, y, lights) {
    const Wt = P.water, rough = cv.noise(4, 911);
    lights.push([x, y, 22, COOL, 0.08]);
    for (let yy = y - 9; yy <= y + 9; yy++) for (let xx = x - 17; xx <= x + 17; xx++) {
        if (!cv.inside(xx, yy) || !g.floor[yy * cv.w + xx]) continue;
        const i = yy * cv.w + xx, d = ((xx - x) / 15) ** 2 + ((yy - y) / 7) ** 2 + (rough[i] - 0.5) * 0.35;
        if (d > 1.15) continue;
        cv.px[i] = d > 1 ? P.stone[1] : d > 0.85 ? Wt[2] : ((xx - x) / 15) ** 2 + ((yy - y + 2) / 7) ** 2 > 1 ? Wt[0] : Wt[1];
    }
    for (let k = 0; k < 5; k++) cv.put(x - 6 + k * 3, y - 2 + (k % 2), Wt[4 + (k % 2)]);
}

const SIZE = { candles: [6, 13], torch: [5, 30], lantern: [6, 14], urn: [5, 12], statue: [6, 17], topiary: [6, 14], bench: [8, 7], skulls: [8, 9], planks: [9, 7],
    crate: [7, 12], barrel: [6, 13], potions: [8, 7], shrooms: [8, 8], grave: [7, 13], rubble: [9, 6], birch: [15, 17], dryGrass: [5, 6], sapCrystal: [5, 9],
    blossomTree: [12, 31], wisteriaTree: [10, 29], spire: [5, 28], goldStatue: [6, 17], brazierBlue: [5, 30] };
const sizeOf = (kind, r) => (kind === 'boulder' ? [r + 2, Math.ceil(r * 1.5) + 2] : SIZE[kind]);
function draw(cv, kind, x, y, lights, r) {
    const lit = { candles, torch, lantern, potions, shrooms, sapCrystal, spire, brazierBlue };
    if (lit[kind]) return lit[kind](cv, x, y, lights);
    if (kind === 'boulder') return boulder(cv, x, y, r);
    return { urn, statue, topiary, bench, skulls, planks, crate, barrel, grave, rubble, goldStatue, ...plants }[kind](cv, x, y);
}
module.exports = { sprite, web, draw, sizeOf, shelfFungus: plants.shelfFungus, blackPool };
