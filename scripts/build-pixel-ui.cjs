#!/usr/bin/env node
/* 도트 UI 그림(css/themes/pixel*.css가 쓰는 테두리·생명 구슬)을 코드로 찍어 PNG로 쓴다.
 *
 *   node scripts/build-pixel-ui.cjs
 *
 * 한 칸 = 화면 2 CSS px(image-rendering: pixelated로 정수배 확대). 색은 돌판·청동(디아블로 2 향)으로,
 * 모서리는 한 도트씩 따 낸다. 결과: assets/ui/pixel/<이름>.png. 그림을 바꾸려면 이 파일을 고치고 다시 실행한다.
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

/** Life orb ring (48×48 dots): black rim, bronze bevel, glass glint up-left. The middle stays clear for the liquid. */
function orbFrame(size) {
    const c = (size - 1) / 2, r = size / 2;
    return png(size, size, (x, y) => {
        const dx = x - c, dy = y - c, d = Math.hypot(dx, dy), lit = dx + dy < 0;
        if (d > r - .5) return null;
        if (d > r - 2) return INK;
        if (d > r - 3) return lit ? '#b0915d' : '#3a2c1b';
        if (d > r - 5) return '#5d4a2e';
        if (d > r - 6) return lit ? '#261d12' : '#7b6341';
        if (d > r - 7) return INK;
        if (Math.hypot(dx + 9, dy + 10) < 1.6) return '#fff6e8b0';
        if (d > r - 12 && d < r - 9 && dx < -5 && dy < -3) return '#ffecd238';
        return null;
    });
}
/** Alpha mask of the orb's glass: the liquid layers are clipped to it. */
function orbMask(size) {
    const c = (size - 1) / 2, r = size / 2;
    return png(size, size, (x, y) => (Math.hypot(x - c, y - c) <= r - 6.5 ? '#000000' : null));
}

// ─── 전투 HUD 장식(2026-09-30): 뿔 달린 구슬 테, 주 스킬 소켓, 양 끝 기둥 ───────────────
/** Paint-by-code grid for shapes a per-dot formula can't express (horns, finials). */
function raster(width, height) {
    const cells = Array.from({ length: height }, () => Array(width).fill(null));
    const inside = (x, y) => x >= 0 && y >= 0 && x < width && y < height;
    return {
        width, height,
        get: (x, y) => (inside(x, y) ? cells[y][x] : null),
        set(x, y, color) { if (inside(x, y)) cells[y][x] = color; },
        /** One-dot ink outline around everything painted so far, like hand-drawn pixel art. */
        outline() {
            const edge = [];
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (cells[y][x]) continue;
                    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside(x + dx, y + dy) && cells[y + dy][x + dx])) edge.push([x, y]);
                }
            }
            edge.forEach(([x, y]) => { cells[y][x] = INK; });
        },
        toPng() { return png(width, height, (x, y) => cells[y][x]); }
    };
}
// 뿔·장식의 청동-뼈 색 단계(밝음 → 어두움). 빛은 왼쪽 위에서.
const HORN_RAMP = ['#e6d3a4', '#c4a46c', '#9a7a4a', '#6e5433', '#46341f'];
/** A tube of dots along points[] (each [x, y, radius]); shading by the surface normal, darker rib every few steps. */
function tube(canvas, points, ribEvery = 0) {
    points.forEach(([x, y, r], index) => {
        const reach = Math.ceil(r);
        const rib = ribEvery && Math.floor(index / ribEvery) % 2 === 1;
        for (let dy = -reach; dy <= reach; dy++) {
            for (let dx = -reach; dx <= reach; dx++) {
                const d = Math.hypot(dx, dy);
                if (d > r) continue;
                const light = d < .01 ? .4 : (-dx - dy) / (d * Math.SQRT2) * Math.min(1, d / r * 1.4);
                const step = light > .45 ? 0 : light > .08 ? 1 : light > -.3 ? 2 : light > -.65 ? 3 : 4;
                canvas.set(Math.round(x + dx), Math.round(y + dy), HORN_RAMP[Math.min(4, step + (rib ? 1 : 0))]);
            }
        }
    });
}
/** Points of a quadratic curve p0 → p2 (control p1) with the radius tapering r0 → r1. */
function curve(p0, p1, p2, r0, r1, steps = 120) {
    return Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps, u = 1 - t;
        return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1], r0 + (r1 - r0) * t];
    });
}
/** The life orb's ring drawn at an offset inside a larger canvas (same rings as orbFrame). */
function paintOrbRing(canvas, ox, oy, size) {
    const c = (size - 1) / 2, r = size / 2;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - c, dy = y - c, d = Math.hypot(dx, dy), lit = dx + dy < 0;
            let color = null;
            if (d > r - .5) continue;
            if (d > r - 2) color = INK;
            else if (d > r - 3) color = lit ? '#b0915d' : '#3a2c1b';
            else if (d > r - 5) color = '#5d4a2e';
            else if (d > r - 6) color = lit ? '#261d12' : '#7b6341';
            else if (d > r - 7) color = INK;
            else if (Math.hypot(dx + 9, dy + 10) < 1.6) color = '#fff6e8b0';
            else if (d > r - 12 && d < r - 9 && dx < -5 && dy < -3) color = '#ffecd238';
            if (color) canvas.set(ox + x, oy + y, color);
        }
    }
}
function rivet(canvas, x, y) {
    canvas.set(x, y, '#f3d28c');
    canvas.set(x + 1, y, '#a87c3e');
    canvas.set(x, y + 1, '#a87c3e');
    canvas.set(x + 1, y + 1, '#5a3f1c');
}
/** Life orb crest (64×58 dots): the 48-dot ring low in the canvas, two ribbed horns rising from its shoulders and curling
 * inward, a keystone clasp on top and rivets at the sides. The glass stays clear for the liquid underneath. */
function orbCrest() {
    const canvas = raster(64, 58), ox = 8, oy = 10, cx = ox + 23.5, cy = oy + 23.5;
    const left = curve([cx - 15, cy - 16], [cx - 29, cy - 27], [cx - 13, cy - 33], 4.2, 1.1);
    tube(canvas, left, 11);
    tube(canvas, left.map(([x, y, r]) => [2 * cx - x, y, r]), 11);
    canvas.outline();
    paintOrbRing(canvas, ox, oy, 48);
    for (let y = -26; y <= -21; y++) {
        const half = y < -24 ? 5 : 4;
        for (let x = -half; x <= half; x++) {
            const edge = Math.abs(x) === half || y === -26 || y === -21;
            canvas.set(Math.round(cx + x), Math.round(cy + y), edge ? INK : y < -23 ? '#b0915d' : '#6b5534');
        }
    }
    rivet(canvas, Math.round(cx) - 1, Math.round(cy) - 25);
    [[-21.5, 0], [21.5, 0], [-15, 15], [15, 15]].forEach(([dx, dy]) => rivet(canvas, Math.round(cx + dx) - 1, Math.round(cy + dy) - 1));
    return canvas.toPng();
}
/** Main skill socket (36×36 dots): bronze ring with four studs around an ember band; the gem art sits in the middle. */
function emblemRing(size) {
    const c = (size - 1) / 2, r = size / 2;
    const studs = [45, 135, 225, 315].map(deg => [c + (r - 3.5) * Math.cos(deg * Math.PI / 180), c + (r - 3.5) * Math.sin(deg * Math.PI / 180)]);
    return png(size, size, (x, y) => {
        const dx = x - c, dy = y - c, d = Math.hypot(dx, dy), lit = dx + dy < 0;
        if (d > r - .5) return null;
        if (studs.some(([sx, sy]) => Math.hypot(x - sx, y - sy) < 1.3)) return '#f3d28c';
        if (d > r - 1.6) return INK;
        if (d > r - 2.6) return lit ? '#b0915d' : '#3a2c1b';
        if (d > r - 4.5) return '#5d4a2e';
        if (d > r - 5.5) return INK;
        if (d > r - 7.5) return lit ? '#e0823a' : '#8a3414';
        if (d > r - 8.5) return lit ? '#6a2410' : '#3a120a';
        return null;
    });
}
// 화로 불꽃: 가장자리 → 속불(경험치 막대·주 스킬 고리와 같은 불씨 색)
const FLAME_RAMP = ['#6e1e10', '#b8401a', '#e07a2c', '#f5b653', '#ffe7a8'];
/** Teardrop tongue of fire: widest near the bottom, tip at (x, top); colour by distance from its axis. */
function flameTongue(canvas, x, top, bottom, width) {
    for (let y = top; y <= bottom; y++) {
        const t = (y - top) / Math.max(1, bottom - top), half = width * Math.sin(Math.PI * Math.min(1, t * .92 + .08)) ** .9 * (t < .7 ? t / .7 : 1);
        for (let dx = -Math.ceil(half); dx <= Math.ceil(half); dx++) {
            if (Math.abs(dx) > half) continue;
            const core = 1 - Math.abs(dx) / Math.max(.8, half), heat = core * (.35 + .65 * t);
            const step = heat > .72 ? 4 : heat > .5 ? 3 : heat > .3 ? 2 : heat > .12 ? 1 : 0;
            const at = [Math.round(x + dx), y], was = canvas.get(...at);
            const rank = was ? FLAME_RAMP.indexOf(was) : -1;
            if (step > rank) canvas.set(...at, FLAME_RAMP[step]);
        }
    }
}
/** End ornament (24×56 dots, the right one is mirrored in CSS): a carved stone pillar with bronze bands on a plinth,
 * crowned by a bronze brazier with a low fire. */
function hudCap() {
    const canvas = raster(24, 56);
    for (let y = 16; y <= 22; y++) {
        const t = (y - 16) / 6, half = 9.5 - 4 * t;
        for (let x = Math.round(12 - half); x < Math.round(12 + half); x++) {
            const lit = x < 12 - half + 2, dark = x > 12 + half - 3;
            canvas.set(x, y, y === 16 ? '#e0a040' : y === 17 ? '#3a2c1b' : lit ? '#b0915d' : dark ? '#3a2c1b' : y === 19 ? '#8a6c42' : '#6b5534');
        }
    }
    for (let y = 23; y < 56; y++) {
        const plinth = y >= 49, capital = y < 26;
        const half = plinth ? 9 : capital ? 3 : 5;
        for (let x = 12 - half; x < 12 + half; x++) {
            const edge = x === 12 - half ? 'lit' : x === 12 + half - 1 ? 'dark' : '';
            const band = !plinth && !capital && (y - 27) % 9 < 2;
            const stone = edge === 'lit' ? '#6a5c4a' : edge === 'dark' ? '#1d1914' : y % 5 === 0 && x % 3 === 1 ? '#2e2822' : '#3a322a';
            canvas.set(x, y, capital || band ? (edge === 'dark' ? '#3a2c1b' : edge === 'lit' ? '#b0915d' : '#6b5534') : plinth ? (edge === 'lit' ? '#5a4d3d' : '#2a241e') : stone);
        }
    }
    canvas.outline();
    // Fire after the outline: flames carry their own dark-red edge.
    flameTongue(canvas, 12, 3, 16, 5.2);
    flameTongue(canvas, 8.5, 8, 16, 3);
    flameTongue(canvas, 15.5, 7, 16, 3.2);
    return canvas.toPng();
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
    'orb-frame.png': orbFrame(48),
    'orb-mask.png': orbMask(48),
    // 전투 HUD 판: 붉은 기가 도는 무쇠 판에 청동 테, 네 귀에 금빛 리벳(무거운 판보다 한 겹 두껍다).
    'frame-hud.png': frame(13, [INK, ['#8f6f45', '#2a1e14', '#5a4630'], '#4a3526', '#34231d', '#2b1d18', ['#170f0c', '#5b4633', '#3a2d22'], INK],
        { at: 3, color: '#e3bb6a' }),
    'orb-crest.png': orbCrest(),
    'emblem-ring.png': emblemRing(36),
    'hud-cap.png': hudCap(),
    'potion-glass.png': sprite(POTION_GLASS, POTION_PALETTE),
    'potion-mask.png': sprite(POTION_LIQUID, { '#': '#000000' }),
    'rignin-logo-52.png': pixelLogo(logo, 52, .2),
    'rignin-logo-120.png': pixelLogo(logo, 120, .3)
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, data] of Object.entries(FILES)) fs.writeFileSync(path.join(OUT, name), data);
console.log(`도트 UI 그림 ${Object.keys(FILES).length}개를 ${path.relative(process.cwd(), OUT)}에 썼습니다.`);
