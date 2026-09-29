#!/usr/bin/env node
/* 도트 UI 그림(css/themes/pixel*.css가 쓰는 테두리·생명 구슬)을 코드로 찍어 PNG로 쓴다.
 *
 *   node scripts/build-pixel-ui.cjs
 *
 * 한 칸 = 화면 2 CSS px(image-rendering: pixelated로 정수배 확대). 색은 돌판·청동(디아블로 2 향)으로,
 * 모서리는 한 도트씩 따 낸다. 둥근 테(구슬·미니맵·메뉴 소켓)만 1 CSS px 도트로 화면 크기 그대로 찍는다. 결과: assets/ui/pixel/<이름>.png. 그림을 바꾸려면 이 파일을 고치고 다시 실행한다.
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

/** n×n nine-slice frame: rings from the outside in; a ring is one colour or [top-left, bottom-right, corner seam]. */
function frame(n, rings, stud) {
    const last = n - 1;
    return png(n, n, (x, y) => {
        if ((x === 0 || x === last) && (y === 0 || y === last)) return null;
        if (stud && [stud.at, last - stud.at].includes(x) && [stud.at, last - stud.at].includes(y)) return stud.color;
        const ring = rings[Math.min(x, y, last - x, last - y)];
        if (!ring || typeof ring === 'string') return ring || null;
        const side = x + y - last;
        return side < 0 ? ring[0] : side > 0 ? ring[1] : ring[2];
    });
}

// ─── 둥근 테(2026-09-30 다시): 한 도트 = 1 CSS px ────────────────────────────────
// 2px 도트로 찍은 작은 원은 계단이 굵어 팔각형처럼 찌그러져 보였다. 둥근 테만 화면 크기 그대로(1px 도트) 찍는다.
// 색은 여전히 몇 단계로 끊어 칠하고(그라데이션 없음), 빛은 왼쪽 위에서 — 둘레를 돌며 다섯 단으로 바뀐다
// (예전처럼 대각선에서 밝음/어둠이 딱 갈리면 그 자리가 찌그러진 것처럼 보였다).
const BRONZE = ['#2e2315', '#4a3a24', '#6b5534', '#9a7c4c', '#cfae70'];
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
/** Round bezel, one dot per CSS px. bands: outside → in, [width px, kind]; inside(dx, dy, d, hole) paints the opening. */
function bezel(size, bands, inside) {
    const c = (size - 1) / 2, r = size / 2;
    return png(size, size, (x, y) => {
        const dx = x - c, dy = y - c, d = Math.hypot(dx, dy);
        if (d > r - .5) return null;
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
    'frame-heavy.png': frame(11, [INK, ['#a88a58', '#3a2c1b', '#6b5534'], '#5d4a2e', ['#261d12', '#7b6341', '#4a3a24'], INK],
        { at: 2, color: '#e3bb6a' }),
    // 떠 있는 판(전투 기록·목표·메뉴 레일·툴팁): 검은 테 → 청동 볼록 → 어두운 선.
    'frame-light.png': frame(7, [INK, ['#8d7249', '#2c2216', '#5a472d'], '#0d0b08']),
    // 움푹 들어간 칸(입력·빈 슬롯): 검은 테 → 오목 청동.
    'frame-inset.png': frame(5, [INK, ['#16120c', '#5e4b30', '#2e2518']]),
    // 하단 HUD 둥근 테(1px 도트, 화면 크기 그대로): 구슬 PC 96 · 휴대폰 68, 미니맵 PC 136 · 휴대폰 100.
    'orb-ring-96.png': bezel(96, ORB_BANDS[96], glint),
    'orb-hole-96.png': hole(96, ORB_BANDS[96]),
    'orb-ring-68.png': bezel(68, ORB_BANDS[68], glint),
    'orb-hole-68.png': hole(68, ORB_BANDS[68]),
    'map-ring-136.png': bezel(136, MAP_BANDS[136]),
    'map-hole-136.png': hole(136, MAP_BANDS[136]),
    'map-ring-100.png': bezel(100, MAP_BANDS[100]),
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
