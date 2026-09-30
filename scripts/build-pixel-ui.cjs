#!/usr/bin/env node
/* 도트 UI 그림(css/themes/pixel*.css가 쓰는 테두리·생명 구슬)을 코드로 찍어 PNG로 쓴다.
 *
 *   node scripts/build-pixel-ui.cjs
 *
 * 한 칸 = 화면 2 CSS px(image-rendering: pixelated로 정수배 확대). 결은 나무 판 · 검은 쇠 테 · 청동 매듭(2026-09-30 사용자 참고
 * 그림의 방향 — 그림을 옮기지 않고 같은 결로 새로 찍는다): 창은 쇠 테 안에 두 가닥 청동 띠가 엮이고 네 귀에 리벳 박힌 쇠 판,
 * 바탕은 세로 판자, 단추는 가로 결 판에 쇠 테(주 동작은 금 테), 칸은 판에 움푹 팬 자리. 둥근 테(구슬·미니맵·메뉴 소켓)만 1 CSS px 도트로 화면 크기 그대로 찍는다. 결과: assets/ui/pixel/<이름>.png. 그림을 바꾸려면 이 파일을 고치고 다시 실행한다.
 * 로고는 원본(assets/ui/rignin-logo.png)을 도트 해상도로 줄여 금빛 5단계로 다시 칠한다(52도트: 메뉴 레일, 120도트: 시작 화면).
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const OUT = path.resolve(__dirname, '..', 'assets/ui/pixel');
const INK = '#050404';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});
function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crc]);
}
/** '#rrggbb' | '#rrggbbaa' | null → [r, g, b, a] */
function rgba(color) {
    if (!color) return [0, 0, 0, 0];
    const hex = color.slice(1);
    const at = i => parseInt(hex.slice(i, i + 2), 16);
    return [at(0), at(2), at(4), hex.length === 8 ? at(6) : 255];
}
/** RGBA 8-bit, non-interlaced PNG → { width, height, data } (the only kind this script reads). */
function decodePng(buffer) {
    let width = 0, height = 0;
    const idat = [];
    for (let at = 8; at < buffer.length;) {
        const length = buffer.readUInt32BE(at), type = buffer.toString('ascii', at + 4, at + 8), data = buffer.subarray(at + 8, at + 8 + length);
        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error('RGBA 8-bit non-interlaced PNG only');
        } else if (type === 'IDAT') idat.push(data);
        at += 12 + length;
    }
    const raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * 4, out = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)], line = y * (stride + 1) + 1, row = y * stride;
        for (let x = 0; x < stride; x++) {
            const a = x >= 4 ? out[row + x - 4] : 0, b = y ? out[row - stride + x] : 0, c = x >= 4 && y ? out[row - stride + x - 4] : 0;
            const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
            const predictor = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
            out[row + x] = (raw[line + x] + predictor) & 255;
        }
    }
    return { width, height, data: out };
}
function png(width, height, pixel) {
    const raw = Buffer.alloc((width * 4 + 1) * height);
    for (let y = 0; y < height; y++) {
        const row = y * (width * 4 + 1);
        for (let x = 0; x < width; x++) rgba(pixel(x, y)).forEach((v, i) => { raw[row + 1 + x * 4 + i] = v; });
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr.set([8, 6, 0, 0, 0], 8);
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
    ]);
}

// ─── 판 · 테 · 단추(2026-09-30): 나무 · 검은 쇠 · 청동 매듭 ─────────────────────────────
const IRON = ['#0e0e11', '#16161a', '#1f1f24', '#29292f', '#37373f', '#4a4a53', '#5d5d68'];
const BRASS = ['#2a1d0f', '#473218', '#6a4c24', '#8f6a35', '#b88e50', '#dcb676', '#f3d9a2'];
// 나무는 채도를 눌러 어둡게(2026-09-30 두 번째 피드백: 전체 톤다운).
const WOOD = ['#1b120c', '#231710', '#2c1d14', '#352318', '#3e291c', '#472f20', '#503525'];
// 매듭 · 판 장식은 사용자 참고 그림의 톤: 밝은 금이 아니라 갈색 도는 옛 청동, 틈은 따뜻한 검정.
const KNOT = ['#18110b', '#2f2217', '#4a3521', '#624a2e', '#7d613d', '#977a4f'];
const KNOT_GROUND = ['#141110', '#1b1714'];
const speck = (x, y, s = 0) => (((x * 73856093) ^ (y * 19349663) ^ (s * 83492791)) >>> 0) % 1000 / 1000;
const tone = (ramp, i) => ramp[Math.max(0, Math.min(ramp.length - 1, i))];

// 매듭 띠: 두 가닥이 번갈아 위아래로 엮인다(높이 6도트, 12도트마다 한 번). 가닥은 위가 밝고 아래가 어두우며 어두운 윤곽을 두르고,
// 교차점에서 아래로 지나는 가닥은 위 가닥 옆에서 끊겨 엮임이 보인다.
const BRAID = { height: 6, period: 12 };
const strandShade = (y, centre) => (y < centre - .35 ? KNOT[5] : (y > centre + .35 ? KNOT[2] : KNOT[4]));
function braidAt(x, y) {
    const t = ((x % BRAID.period) + BRAID.period) % BRAID.period, phase = t / BRAID.period * Math.PI * 2;
    const mid = (BRAID.height - 1) / 2, ya = mid + 1.9 * Math.sin(phase), yb = mid - 1.9 * Math.sin(phase);
    const aOver = t <= 3 || t >= 9;                        // around x≡0 strand A lies on top, around x≡6 strand B
    const [over, under] = aOver ? [ya, yb] : [yb, ya], dOver = Math.abs(y - over), dUnder = Math.abs(y - under);
    if (dOver < .95) return strandShade(y, over);
    if (dUnder < .95) return dOver < 1.7 ? KNOT[0] : strandShade(y, under);
    return Math.min(dOver, dUnder) < 1.6 ? KNOT[0] : null;
}
function rivet(dx, dy) {
    const d = Math.hypot(dx, dy);
    if (d > 1.9) return null;
    if (d > 1.25) return BRASS[1];
    return dx + dy < 0 ? BRASS[6] : BRASS[3];
}
/** Corner plate (12×12 at a corner): a bevelled iron square with a bronze inner square and a rivet. */
function cornerPlate(x, y) {
    if (x > 11 || y > 11) return undefined;
    if (x === 0 || y === 0 || x === 11 || y === 11) return INK;
    const r = rivet(x - 5.5, y - 5.5);
    if (r) return r;
    if (x === 1 || y === 1) return IRON[6];
    if (x === 10 || y === 10) return IRON[1];
    const square = ((x === 3 || x === 8) && y >= 3 && y <= 8) || ((y === 3 || y === 8) && x >= 3 && x <= 8);
    if (square) return x + y < 11 ? KNOT[4] : KNOT[2];
    return speck(x, y, 3) < .1 ? IRON[5] : IRON[4];
}
/** Heavy edge, outside → in: ink · iron bevel ×2 · ink · braid ×6 on dark iron · ink · iron · ink. */
function heavyEdge(depth, along, lit) {
    if (depth === 0 || depth === 3 || depth === 4 + BRAID.height || depth === 12) return INK;
    if (depth === 1) return lit ? IRON[6] : IRON[2];
    if (depth === 2) return lit ? IRON[4] : IRON[1];
    if (depth < 4 + BRAID.height) return braidAt(along, depth - 4) || KNOT_GROUND[speck(along, depth, 5) < .1 ? 1 : 0];
    return lit ? IRON[2] : IRON[4];
}
/** 창 · 대화 상자 테: 13 + 12 + 13 = 38도트 9칸 자르기(가운데는 비움 — 바탕 판은 요소 배경). 가장자리는 round로 되풀이. */
function heavyFrame() {
    const s = 13, n = s * 2 + BRAID.period, last = n - 1;
    return png(n, n, (x, y) => {
        const cx = x < s ? x : (x > last - s ? last - x : null), cy = y < s ? y : (y > last - s ? last - y : null);
        const plate = cx !== null && cy !== null ? cornerPlate(cx, cy) : undefined;
        if (plate !== undefined) return plate;
        const depth = Math.min(x, y, last - x, last - y);
        if (depth > 12) return null;
        const d = { top: y, left: x, bottom: last - y, right: last - x };
        const edge = Object.keys(d).reduce((a, b) => (d[a] <= d[b] ? a : b));
        return heavyEdge(depth, (edge === 'top' || edge === 'bottom' ? x : y) - s, edge === 'top' || edge === 'left');
    });
}
/** HUD · 메뉴 띠 · 보스 체력 막대의 판 테: 11도트, 자르기 5(예전 두꺼운 테와 같은 10px). 쇠 볼록 · 쇠 · 청동 선, 네 귀에 징. */
function plateFrame() {
    const n = 11, last = n - 1;
    return png(n, n, (x, y) => {
        if ((x === 0 || x === last) && (y === 0 || y === last)) return null;
        const depth = Math.min(x, y, last - x, last - y), lit = x + y < last;
        if (Math.hypot(Math.min(x, last - x) - 2, Math.min(y, last - y) - 2) < .9) return lit ? BRASS[6] : BRASS[4];
        if (depth === 0 || depth === 4) return INK;
        if (depth === 1) return lit ? IRON[6] : IRON[2];
        if (depth === 2) return lit ? IRON[4] : IRON[3];
        return lit ? BRASS[4] : BRASS[2];
    });
}
/** 떠 있는 판(전투 기록 · 목표 · 툴팁 · 메뉴)의 얇은 테: 7도트, 자르기 3(예전 가벼운 테와 같은 6px). 먹선 · 쇠 볼록 · 먹선. */
function thinFrame() {
    const n = 7, last = n - 1;
    return png(n, n, (x, y) => {
        if ((x === 0 || x === last) && (y === 0 || y === last)) return null;
        const depth = Math.min(x, y, last - x, last - y), lit = x + y < last;
        if (depth === 1) return lit ? IRON[6] : IRON[2];
        return depth === 0 || depth === 2 ? INK : null;
    });
}
/** 움푹한 칸(입력 · 빈 슬롯): 6도트, 자르기 2 — 판에 팬 자리라 위 · 왼쪽이 어둡고 아래 · 오른쪽이 밝다. */
function insetFrame() {
    const last = 5;
    return png(6, 6, (x, y) => {
        const depth = Math.min(x, y, last - x, last - y);
        if (depth === 0) return INK;
        return depth === 1 ? (x + y < last ? '#0a0605' : WOOD[5]) : null;
    });
}
/** Tileable value noise: a cells×cells lattice over a size×size tile, smoothed. */
function valueNoise(size, cells, seed) {
    const at = (i, j) => speck(((i % cells) + cells) % cells, ((j % cells) + cells) % cells, seed);
    const ease = v => v * v * (3 - 2 * v);
    return (x, y) => {
        const fx = x / size * cells, fy = y / size * cells, i = Math.floor(fx), j = Math.floor(fy), u = ease(fx - i), v = ease(fy - j);
        const top = at(i, j) + (at(i + 1, j) - at(i, j)) * u, bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
        return top + (bottom - top) * v;
    };
}
/** 창 바탕: 거친 판 한 장(64도트, 되풀이해도 이음새가 없게). 너비가 다른 판 셋 · 흐린 이음매 · 굽이치는 결 · 옅은 얼룩 · 옹이 하나. */
const SLAB = 64, SEAMS = [0, 23, 44], KNOT_AT = { x: 34, y: 18 };
function slab(shade) {
    const blotch = valueNoise(SLAB, 4, 11), drift = valueNoise(SLAB, 8, 23), turn = 2 * Math.PI / SLAB;
    return png(SLAB, SLAB, (x, y) => {
        if (SEAMS.includes(x)) return tone(WOOD, 1 + shade);
        const kx = x - KNOT_AT.x, ky = ((y - KNOT_AT.y + SLAB * 1.5) % SLAB) - SLAB / 2, knot = Math.hypot(kx * 1.7, ky);
        const bend = knot < 9 ? 2.5 * Math.exp(-knot / 4) * Math.sign(kx || 1) : 0;
        const wobble = .7 * Math.sin(y * turn + x * turn) + .45 * Math.sin(y * turn * 2 + 1.7) + bend;
        const grain = Math.sin((x + wobble) * turn * 7 + drift(x, y) * 6);
        let level = 3 + shade + Math.round((blotch(x, y) - .5) * 2.2);
        if (grain > .9 && speck(x, y, 4) > .12) level -= 1;
        if (SEAMS.includes(x - 1) && speck(x, y, 2) < .55) level += 1;
        if (knot < 2.2) level -= knot < 1.2 ? 2 : 1;
        if (speck(x, y, 7) < .025) level -= 1;
        return tone(WOOD, level);
    });
}
/** 단추 바탕: 가로 결 한 장(32×12). */
function board(shade) {
    return png(32, 12, (x, y) => {
        const grain = Math.sin(y * 1.3 + x * .21) + .5 * Math.sin(x * .07 + y * .8);
        return tone(WOOD, 4 + shade + (grain > 1.05 ? 1 : grain < -1.1 ? -1 : 0) - (speck(x, y, 9) < .03 ? 1 : 0));
    });
}
// ─── 둥근 테(2026-09-30 다시): 한 도트 = 1 CSS px ────────────────────────────────
// 2px 도트로 찍은 작은 원은 계단이 굵어 팔각형처럼 찌그러져 보였다. 둥근 테만 화면 크기 그대로(1px 도트) 찍는다.
// 색은 여전히 몇 단계로 끊어 칠하고(그라데이션 없음), 빛은 왼쪽 위에서 — 둘레를 돌며 다섯 단으로 바뀐다
// (예전처럼 대각선에서 밝음/어둠이 딱 갈리면 그 자리가 찌그러진 것처럼 보였다).
const BRONZE = ['#1b1b20', '#2e2e36', '#3f3f49', '#55555f', '#6c6c78']; // 둥근 테도 검은 쇠(2026-09-30), 볼트만 청동
const GOLD = ['#5a3f14', '#8a6424', '#c0903c', '#e6bd68', '#fff0c4'];
function step(ramp, light) {
    return ramp[Math.max(0, Math.min(ramp.length - 1, Math.round((light + 1) / 2 * (ramp.length - 1))))];
}
/** One band of a bezel. light ∈ [-1, 1]: how much this spot of the ring faces the up-left light. */
function bandColor(kind, light) {
    if (kind === 'ink') return INK;
    if (kind === 'bevel') return step(BRONZE, light);
    if (kind === 'body') return step(BRONZE, light * .35);
    if (kind === 'hollow') return step(BRONZE, -light * .7 - .3);
    if (kind === 'gold') return step(GOLD, light * .8 + .2);
    return null;
}
/** Bronze bolts on a bezel: `count` round heads centred `inset` px inside the rim (lit up-left). */
function boltAt(dx, dy, r, bolts) {
    if (!bolts) return null;
    const step = Math.PI * 2 / bolts.count, angle = Math.round(Math.atan2(dy, dx) / step) * step;
    const bx = (r - bolts.inset) * Math.cos(angle), by = (r - bolts.inset) * Math.sin(angle), d = Math.hypot(dx - bx, dy - by);
    if (d >= bolts.size) return null;
    return d < bolts.size * .55 ? (dx - bx + dy - by < 0 ? BRASS[6] : BRASS[4]) : BRASS[1];
}
/** Round bezel, one dot per CSS px. bands: outside → in, [width px, kind]; inside(dx, dy, d, hole) paints the opening. */
function bezel(size, bands, inside, bolts) {
    const c = (size - 1) / 2, r = size / 2;
    return png(size, size, (x, y) => {
        const dx = x - c, dy = y - c, d = Math.hypot(dx, dy);
        if (d > r - .5) return null;
        const bolt = boltAt(dx, dy, r, bolts);
        if (bolt) return bolt;
        const light = d ? -(dx + dy) / (d * Math.SQRT2) : 0;
        let edge = r - .5;
        for (const [width, kind] of bands) {
            if (d > edge - width) return bandColor(kind, light);
            edge -= width;
        }
        return inside ? inside(dx, dy, d, edge) : null;
    });
}
const bezelWidth = bands => bands.reduce((sum, [width]) => sum + width, 0);
/** Alpha mask of a bezel's opening (liquid and the minimap canvas are clipped to it; half a px under the inner ink). */
function hole(size, bands) {
    const c = (size - 1) / 2, edge = size / 2 - .5 - bezelWidth(bands) + .5;
    return png(size, size, (x, y) => (Math.hypot(x - c, y - c) <= edge ? '#000000' : null));
}
/** Glass glint on the orbs: a short curved streak and a dot, up-left. */
function glint(dx, dy, d, edge) {
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (d > edge - .16 * edge && d <= edge - .07 * edge && angle > -168 && angle < -118) return '#fff6e852';
    if (Math.hypot(dx + edge * .5, dy + edge * .5) < Math.max(1.6, edge * .075)) return '#fff6e8b8';
    return null;
}
// 테 두께(px, 바깥→안): 구슬 = 먹선 · 볼록 · 청동 · 오목 · 먹선, 미니맵 = 같은 테 + 탐험 비율 홈(비움) + 먹선.
const ORB_BANDS = { 96: [[2, 'ink'], [3, 'bevel'], [3, 'body'], [2, 'hollow'], [2, 'ink']], 68: [[2, 'ink'], [2, 'bevel'], [2, 'body'], [1, 'hollow'], [2, 'ink']] };
const MAP_BANDS = {
    136: [[2, 'ink'], [3, 'bevel'], [3, 'body'], [2, 'hollow'], [2, 'ink'], [3, 'clear'], [1, 'ink']],
    100: [[2, 'ink'], [2, 'bevel'], [2, 'body'], [1, 'hollow'], [2, 'ink'], [2, 'clear'], [1, 'ink']]
};
// 메뉴 단추 소켓: 먹선 · 볼록 · 먹선, 안은 움푹한 어둠(왼쪽 위가 더 어둡다). 열린 창은 금빛 테.
const KEY_BANDS = [[2, 'ink'], [2, 'bevel'], [1, 'ink']];
const KEY_BANDS_ON = [[2, 'ink'], [2, 'gold'], [1, 'ink']];
function keyWell(dx, dy, d, edge) {
    const light = d ? -(dx + dy) / (d * Math.SQRT2) : 0;
    return d > edge - 3 && light > .25 ? '#060504' : '#16120c';
}
/** Menu icons (scripts/pixel-menu-icons.cjs) side by side, 13 dots each; CSS picks one with --px-icon and draws it 2×. */
function iconStrip() {
    const { PALETTE, ICONS, ORDER } = require('./pixel-menu-icons.cjs');
    return png(13 * ORDER.length, 13, (x, y) => PALETTE[ICONS[ORDER[Math.floor(x / 13)]][y][x % 13]] || null);
}

/** ASCII pixel map → PNG. Each character is one dot; '.' is clear. */
function sprite(rows, palette) {
    return png(rows[0].length, rows.length, (x, y) => palette[rows[y][x]] || null);
}
// 물약(12×14 도트): 병 테·코르크·유리 반짝임. 액체는 potion-mask 모양에 CSS 색(--flask-liquid)을 칠해 병 아래에 깐다.
const POTION_GLASS = [
    '....cccc....',
    '....cCCc....',
    '....KggK....',
    '....KgGK....',
    '...KgggGK...',
    '..KgW...gK..',
    '.KgW.....gK.',
    '.KW.......K.',
    'KgW........K',
    'Kg.........K',
    'Kg.........K',
    '.K........K.',
    '.KK......KK.',
    '...KKKKKK...'
];
const POTION_LIQUID = [
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '..########..',
    '.##########.',
    '.##########.',
    '.##########.',
    '..########..',
    '...######...',
    '............'
];
const POTION_PALETTE = { K: INK, c: '#5a3a1c', C: '#9a6a36', g: '#b9c4c099', G: '#e8f0ec', W: '#ffffffb8' };

/** Box-filter the source down to n×n dots, drop edges fainter than `cut` (lower keeps thin strokes at small sizes), repaint by brightness with a gold ramp. */
function pixelLogo(source, n, cut) {
    const ramp = ['#4a3418', '#7a5628', '#a87c3e', '#d4a95c', '#f3d492'];
    const step = source.width / n;
    return png(n, n, (x, y) => {
        let r = 0, g = 0, b = 0, alpha = 0, count = 0;
        for (let sy = Math.floor(y * step); sy < Math.floor((y + 1) * step); sy++) {
            for (let sx = Math.floor(x * step); sx < Math.floor((x + 1) * step); sx++) {
                const i = (sy * source.width + sx) * 4, a = source.data[i + 3] / 255;
                r += source.data[i] * a; g += source.data[i + 1] * a; b += source.data[i + 2] * a; alpha += a; count++;
            }
        }
        if (alpha / count < cut) return null;
        const light = (.3 * r + .59 * g + .11 * b) / alpha / 255;
        return ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(light * 1.35 * (ramp.length - 1))))];
    });
}

const logo = decodePng(fs.readFileSync(path.resolve(__dirname, '..', 'assets/ui/rignin-logo.png')));
const FILES = {
    // 창·대화 상자·전투 HUD: 검은 테 → 청동 볼록 → 청동 → 청동 오목 → 검은 선, 네 귀에 금빛 징.
    // 창 · 대화 상자 · 전투 HUD: 쇠 테 + 청동 매듭 띠 + 리벳 모서리 판(38도트, 자르기 13).
    'frame-heavy.png': heavyFrame(),
    // HUD · 메뉴 띠 · 보스 체력 막대: 쇠 판 테 + 청동 징(11도트, 자르기 5 = 예전 10px).
    'frame-plate.png': plateFrame(),
    // 떠 있는 판(전투 기록 · 목표 · 메뉴 레일 · 툴팁): 얇은 쇠 테(7도트, 자르기 3 = 예전 6px).
    'frame-light.png': thinFrame(),
    // 움푹한 칸(입력 · 빈 슬롯): 6도트, 자르기 2.
    'frame-inset.png': insetFrame(),
    // 바탕: 창의 거친 판(밝은 판 · 제목 줄과 HUD의 어두운 판), 단추의 가로 결 판(보통 · 올렸을 때).
    'wood.png': slab(0),
    'wood-dark.png': slab(-1),
    'board.png': board(0),
    'board-hot.png': board(1),
    // 하단 HUD 둥근 테(1px 도트, 화면 크기 그대로): 쇠 테에 청동 볼트 여덟. 구슬 PC 96 · 휴대폰 68, 미니맵 PC 136 · 휴대폰 100.
    'orb-ring-96.png': bezel(96, ORB_BANDS[96], glint, { count: 8, inset: 5.5, size: 2.2 }),
    'orb-hole-96.png': hole(96, ORB_BANDS[96]),
    'orb-ring-68.png': bezel(68, ORB_BANDS[68], glint, { count: 8, inset: 4, size: 1.7 }),
    'orb-hole-68.png': hole(68, ORB_BANDS[68]),
    'map-ring-136.png': bezel(136, MAP_BANDS[136], null, { count: 8, inset: 5.5, size: 2.2 }),
    'map-hole-136.png': hole(136, MAP_BANDS[136]),
    'map-ring-100.png': bezel(100, MAP_BANDS[100], null, { count: 8, inset: 4, size: 1.7 }),
    'map-hole-100.png': hole(100, MAP_BANDS[100]),
    // 메뉴 단추(PC 하단 바): 둥근 소켓 40px, 열린 창은 금빛 테. 아이콘은 한 줄 그림(13도트 × 개수).
    'key-socket.png': bezel(40, KEY_BANDS, keyWell),
    'key-socket-on.png': bezel(40, KEY_BANDS_ON, keyWell),
    'menu-icons.png': iconStrip(),
    'potion-glass.png': sprite(POTION_GLASS, POTION_PALETTE),
    'potion-mask.png': sprite(POTION_LIQUID, { '#': '#000000' }),
    'rignin-logo-52.png': pixelLogo(logo, 52, .2),
    'rignin-logo-120.png': pixelLogo(logo, 120, .3)
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, data] of Object.entries(FILES)) fs.writeFileSync(path.join(OUT, name), data);
console.log(`도트 UI 그림 ${Object.keys(FILES).length}개를 ${path.relative(process.cwd(), OUT)}에 썼습니다.`);
