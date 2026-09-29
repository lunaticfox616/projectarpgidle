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
    'rignin-logo-52.png': pixelLogo(logo, 52, .2),
    'rignin-logo-120.png': pixelLogo(logo, 120, .3)
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, data] of Object.entries(FILES)) fs.writeFileSync(path.join(OUT, name), data);
console.log(`도트 UI 그림 ${Object.keys(FILES).length}개를 ${path.relative(process.cwd(), OUT)}에 썼습니다.`);
