'use strict';
/* 탐험 맵 그림 도구의 바탕: 씨앗 난수, 값 노이즈, 마스크 연산, 거리 변환, PNG 쓰기.
 * rignin-ui/art-pipeline/tiles/build_map.py(numpy·scipy)를 Node로 옮긴 것. 게임은 이 파일을 불러오지 않는다. */
const zlib = require('node:zlib');

/** mulberry32 난수와 numpy식 도우미. int(a, b)는 [a, b). */
function createRng(seed) {
    let state = seed >>> 0;
    const next = () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
        random: next,
        int: (a, b) => a + Math.floor(next() * (b - a)),
        uniform: (a, b) => a + next() * (b - a),
        normal: (mu = 0, sigma = 1) => mu + sigma * Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next()),
        choice: list => list[Math.floor(next() * list.length)],
        permutation(n) {
            const out = Array.from({ length: n }, (_, i) => i);
            for (let i = n - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
            return out;
        },
        weighted(weights) {
            const total = weights.reduce((sum, w) => sum + w, 0);
            let pick = next() * total;
            for (let i = 0; i < weights.length; i++) { pick -= weights[i]; if (pick < 0) return i; }
            return weights.length - 1;
        }
    };
}

/** 부드러운 값 노이즈(0..1). scale = 격자 한 칸의 픽셀 수. */
function valueNoise(w, h, scale, seed) {
    const rng = createRng(seed * 7919 + 17);
    const gw = Math.floor(w / scale) + 3, gh = Math.floor(h / scale) + 3, grid = new Float32Array(gw * gh);
    for (let i = 0; i < grid.length; i++) grid[i] = rng.random();
    const out = new Float32Array(w * h), ease = t => t * t * (3 - 2 * t);
    for (let y = 0; y < h; y++) {
        const fy = y / scale, y0 = Math.floor(fy), ty = ease(fy - y0);
        for (let x = 0; x < w; x++) {
            const fx = x / scale, x0 = Math.floor(fx), tx = ease(fx - x0), i = y0 * gw + x0;
            const top = grid[i] * (1 - tx) + grid[i + 1] * tx, bottom = grid[i + gw] * (1 - tx) + grid[i + gw + 1] * tx;
            out[y * w + x] = top * (1 - ty) + bottom * ty;
        }
    }
    return out;
}

const CROSS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];

/** 이진 팽창(바깥은 0). offsets = [dx, dy] 구조 요소. */
function dilate(mask, w, h, iterations = 1, offsets = CROSS) {
    let src = mask;
    for (let it = 0; it < iterations; it++) {
        const out = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (!src[y * w + x]) continue;
            for (const [dx, dy] of offsets) {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && ny >= 0 && nx < w && ny < h) out[ny * w + nx] = 1;
            }
        }
        src = out;
    }
    return src;
}

/** 이진 침식(바깥은 0, scipy 기본값과 같다). */
function erode(mask, w, h, iterations = 1) {
    let src = mask;
    for (let it = 0; it < iterations; it++) {
        const out = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const i = y * w + x;
            out[i] = src[i] && x > 0 && y > 0 && x < w - 1 && y < h - 1 && src[i - 1] && src[i + 1] && src[i - w] && src[i + w] ? 1 : 0;
        }
        src = out;
    }
    return src;
}

function closing(mask, w, h, iterations) { return erode(dilate(mask, w, h, iterations), w, h, iterations); }
function invert(mask) { return mask.map(v => (v ? 0 : 1)); }
function and(a, b) { return a.map((v, i) => (v && b[i] ? 1 : 0)); }
function andNot(a, b) { return a.map((v, i) => (v && !b[i] ? 1 : 0)); }
function or(a, b) { return a.map((v, i) => (v || b[i] ? 1 : 0)); }
/** 마스크 가장자리(한 번 침식해서 사라지는 픽셀). */
function edge(mask, w, h) { return andNot(mask, erode(mask, w, h)); }

/** Felzenszwalb 1차 거리 변환(제곱). label은 f 자리의 출처를 따라간다. */
function dt1d(f, labels, n, out, outLabels) {
    const v = new Int32Array(n), z = new Float64Array(n + 1);
    let k = 0;
    v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (let q = 1; q < n; q++) {
        if (f[q] >= 1e19) continue;
        if (f[v[0]] >= 1e19) { v[0] = q; continue; }
        let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
        k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
    }
    if (f[v[0]] >= 1e19) { for (let q = 0; q < n; q++) { out[q] = 1e20; outLabels[q] = -1; } return; }
    k = 0;
    for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) k++;
        out[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
        outLabels[q] = labels[v[k]];
    }
}

/** 정확한 유클리드 거리 변환과 가장 가까운 씨앗. seeds[i]가 참인 곳이 씨앗이다. */
function featureTransform(seeds, w, h) {
    const dist = new Float64Array(w * h), label = new Int32Array(w * h);
    const n = Math.max(w, h), f = new Float64Array(n), lab = new Int32Array(n), out = new Float64Array(n), outLab = new Int32Array(n);
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) { const i = y * w + x; f[y] = seeds[i] ? 0 : 1e20; lab[y] = seeds[i] ? i : -1; }
        dt1d(f, lab, h, out, outLab);
        for (let y = 0; y < h; y++) { dist[y * w + x] = out[y]; label[y * w + x] = outLab[y]; }
    }
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) { f[x] = dist[y * w + x]; lab[x] = label[y * w + x]; }
        dt1d(f, lab, w, out, outLab);
        for (let x = 0; x < w; x++) { dist[y * w + x] = Math.sqrt(out[x]); label[y * w + x] = outLab[x]; }
    }
    return { dist, label };
}

/** scipy distance_transform_edt: 참인 픽셀에서 가장 가까운 거짓 픽셀까지. */
function edt(mask, w, h) {
    const { dist } = featureTransform(invert(mask), w, h);
    return Float32Array.from(dist, d => Math.min(d, 1e6));
}

/** 분리 가우스 흐림(가장자리는 반사). */
function gaussian(values, w, h, sigma) {
    const r = Math.ceil(sigma * 4), kernel = [];
    let sum = 0;
    for (let i = -r; i <= r; i++) { const k = Math.exp(-(i * i) / (2 * sigma * sigma)); kernel.push(k); sum += k; }
    const norm = kernel.map(k => k / sum), mirror = (i, n) => (i < 0 ? -i - 1 : i >= n ? 2 * n - i - 1 : i);
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let i = -r; i <= r; i++) acc += values[y * w + mirror(x + i, w)] * norm[i + r];
        tmp[y * w + x] = acc;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let i = -r; i <= r; i++) acc += tmp[mirror(y + i, h) * w + x] * norm[i + r];
        out[y * w + x] = acc;
    }
    return out;
}

/** numpy.gradient: 가운데 차분(가장자리는 한쪽 차분). */
function gradient(values, w, h) {
    const gx = new Float32Array(w * h), gy = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        gx[i] = x === 0 ? values[i + 1] - values[i] : x === w - 1 ? values[i] - values[i - 1] : (values[i + 1] - values[i - 1]) / 2;
        gy[i] = y === 0 ? values[i + w] - values[i] : y === h - 1 ? values[i] - values[i - w] : (values[i + w] - values[i - w]) / 2;
    }
    return { gx, gy };
}

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
/** RGBA PNG. rgb = 0xRRGGBB 배열, alpha = 0/1 배열(없으면 불투명). */
function encodePng(rgb, w, h, alpha) {
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) {
        const row = y * (w * 4 + 1);
        for (let x = 0; x < w; x++) {
            const c = rgb[y * w + x], o = row + 1 + x * 4;
            raw[o] = (c >> 16) & 255; raw[o + 1] = (c >> 8) & 255; raw[o + 2] = c & 255;
            raw[o + 3] = alpha && !alpha[y * w + x] ? 0 : 255;
        }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr.set([8, 6, 0, 0, 0], 8);
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

module.exports = { createRng, valueNoise, CROSS, dilate, erode, closing, invert, and, andNot, or, edge, featureTransform, edt, gaussian, gradient, encodePng };
