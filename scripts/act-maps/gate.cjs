'use strict';
/* 보스방 관문: 닫힘|열림 두 칸을 옆으로 붙인 그림. 보스방이 남북이면 정면 아치, 동서면 옆에서 본 기둥 한 쌍과 봉인 돌판.
 * 크기와 기준점은 예전 판(build_map.py)과 같아서 data/act-exploration-maps.js의 gateOffset이 그대로 맞는다. */
const { Canvas } = require('./paint.cjs');
const mod = (a, n) => ((a % n) + n) % n;

function archFrame(cv, put, closed) {
    const W = cv.w, H = cv.h, cx = Math.floor(W / 2), top = 22;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const dx = x - cx + 0.5, d = Math.hypot(dx, y - top), pil = (x < 10 || x >= W - 10) && y >= top, arch = y < top && d >= 13 && d <= 22;
        if (!pil && !arch) continue;
        let c;
        if (arch) {
            const ang = (Math.atan2(y - top, dx) + Math.PI) / Math.PI * 9, rim = d > 21 || d < 14, seam = Math.floor((ang % 1) * 8) === 0;
            c = rim || seam ? cv.pal.ink : cv.col('stone', (dx < 0 ? 4 : 3) - (Math.floor(ang) % 2));
            if (Math.floor(ang) === 4 && !rim) c = Math.abs(dx) < 2 && d > 15 && d < 20 ? cv.col('teal', closed ? 3 : 1) : cv.col('stone', 4);
        } else {
            const lx = x < 10 ? x : x - (W - 10);
            c = lx === 0 || lx === 9 || mod(y - top, 7) === 6 ? cv.pal.ink
                : cv.col('stone', 4 - (lx > 4) - (lx > 7) - (Math.floor((y - top) / 7) % 2 && lx > 2 ? 1 : 0));
            if (y >= H - 3) c = y === H - 1 ? cv.pal.ink : cv.col('stone', 2);
        }
        put(x, y, c);
    }
    const vine = [[4, 26], [7, 17], [12, 9], [18, 4], [24, 3], [30, 6], [34, 12]];
    for (let s = 0; s + 1 < vine.length; s++) {
        const [x0, y0] = vine[s], [x1, y1] = vine[s + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let i = 0; i < n; i++) {
            const x = Math.trunc(x0 + (x1 - x0) * i / n), y = Math.trunc(y0 + (y1 - y0) * i / n);
            put(x, y, cv.col('wood', 3)); put(x, y + 1, cv.col('wood', 1)); put(x, y - 1, cv.pal.ink);
        }
    }
    for (const [x, y] of [[8, 16], [15, 6], [27, 4], [33, 10], [3, 30], [40, 34]]) { put(x, y, cv.col('moss', 3)); put(x + 1, y, cv.col('moss', 2)); put(x, y + 1, cv.col('moss', 1)); }
    if (closed) archSeal(cv, put, cx, top);
}
function archSeal(cv, put, cx, top) {
    const W = cv.w, H = cv.h;
    for (let y = top - 12; y < H - 3; y++) for (let x = 10; x < W - 10; x++) {
        const dx = x - cx + 0.5;
        if (y < top && Math.hypot(dx, y - top) > 13) continue;
        const rim = x === 10 || x === W - 11 || x === cx - 1 || x === cx;
        let c = rim ? cv.pal.ink : cv.col('stone', x < cx ? 3 : 2);
        if (!rim && mod(y - top, 9) === 8) c = cv.col('stone', 1);
        put(x, y, c);
    }
    for (let s = 0; s < 40; s++) { const a = s / 40 * Math.PI * 2; put(cx + Math.cos(a) * 6, top + 8 + Math.sin(a) * 6, cv.col('teal', 3)); }
    for (let k = -4; k <= 4; k++) { const c = cv.col('teal', Math.abs(k) < 2 ? 4 : 2); put(cx + k, top + 8, c); put(cx - 1, top + 8 + k, c); }
}

function sideFrame(cv, put, closed) {
    const W = cv.w, H = cv.h, mid = Math.floor(W / 2);
    const post = (baseY, height) => {
        for (let y = baseY - height; y < baseY; y++) for (let x = mid - 4; x < mid + 4; x++) {
            const lx = x - (mid - 4), rim = lx === 0 || lx === 7 || y === baseY - height || y === baseY - 1;
            put(x, y, rim ? cv.pal.ink : cv.col('stone', 4 - (lx > 3) - (lx > 5) - (mod(y - baseY, 6) === 0 ? 1 : 0)));
        }
        for (let x = mid - 3; x < mid + 3; x++) put(x, baseY - height + 1, cv.col('stone', 5));
        put(mid, baseY - height - 1, cv.col('teal', closed ? 3 : 1));
    };
    post(H - 16 - 1, 24);
    if (closed) {
        for (let y = H - 38; y < H - 2; y++) for (let x = mid - 2; x < mid + 2; x++) {
            const rim = x === mid - 2 || x === mid + 1;
            put(x, y, rim ? cv.pal.ink : y % 5 === 0 ? cv.col('teal', 3) : cv.col('stone', x < mid ? 3 : 2));
        }
    }
    post(H, 20);
}

/** @returns {{ rgb: Int32Array, alpha: Uint8Array, w: number, h: number, offset: [number, number] }} */
function buildGate(direction, palette) {
    const [W, H] = direction === 'N' || direction === 'S' ? [44, 52] : [20, 50];
    const rgb = new Int32Array(W * 2 * H), alpha = new Uint8Array(W * 2 * H);
    [true, false].forEach((closed, f) => {
        const cv = new Canvas(W, H, 3, palette);
        const put = (x, y, c) => {
            x = Math.trunc(x); y = Math.trunc(y);
            if (x < 0 || y < 0 || x >= W || y >= H) return;
            rgb[y * W * 2 + f * W + x] = c; alpha[y * W * 2 + f * W + x] = 1;
        };
        (direction === 'N' || direction === 'S' ? archFrame : sideFrame)(cv, put, closed);
    });
    const offset = direction === 'N' ? [-W / 2, 8 + 16 - H] : [-W / 2, 8 - H];
    return { rgb, alpha, w: W * 2, h: H, offset };
}

module.exports = { buildGate };
