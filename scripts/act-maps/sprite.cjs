'use strict';
/* 소품 그리기 바탕: 글자 도트 그림, 바닥에만 드리우는 접지 그림자, 둥근 덩어리, 세운 원기둥. 빛은 왼쪽 위에서. */
const { mix, ambient } = require('./pal.cjs');

/** rows의 글자를 key 색으로(배열이면 [색, 섞는 비율]). 그림 아래 가운데가 (x, y). */
function sprite(cv, rows, x, y, key, flip = false) {
    const h = rows.length, wd = Math.max(...rows.map(r => r.length)), ox = x - Math.floor(wd / 2), oy = y - h;
    rows.forEach((raw, r) => {
        const row = flip ? [...raw.padEnd(wd, '.')].reverse().join('') : raw;
        [...row].forEach((ch, c) => {
            const v = key[ch];
            if (v === undefined) return;
            const px = ox + c, py = oy + r;
            if (!cv.inside(px, py)) return;
            if (Array.isArray(v)) cv.px[py * cv.w + px] = mix(cv.px[py * cv.w + px], v[0], v[1]); else cv.px[py * cv.w + px] = v;
        });
    });
}
/** 접지 그림자: 바닥(cv.floorMask)에만, 벽 윗면에는 드리우지 않는다. */
function shadow(cv, cx, cy, rx, ry, t = 0.42) {
    const dark = ambient();
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        if (!cv.inside(x, y) || (cv.floorMask && !cv.floorMask[y * cv.w + x])) continue;
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d <= 1) cv.px[y * cv.w + x] = mix(cv.px[y * cv.w + x], dark, d < 0.45 ? t : t * 0.6);
    }
}
/** 둥근 덩어리: 빛에 따라 다섯 단계, 그늘 쪽 어두운 테, ramp[0] 외곽선. */
function lump(cv, cx, cy, rx, ry, ramp, seed = 1) {
    const rough = cv.noise(3, 950 + seed);
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        if (!cv.inside(x, y)) continue;
        const i = y * cv.w + x, dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy + (rough[i] - 0.5) * 0.25;
        if (d > 1.22) continue;
        if (d > 1) { cv.px[i] = ramp[0]; continue; }
        const light = -(dx * 0.6 + dy * 0.8) + (rough[i] - 0.5) * 0.4;
        let t = light > 0.75 ? 5 : light > 0.3 ? 4 : light > -0.15 ? 3 : light > -0.6 ? 2 : 1;
        if (d > 0.8 && light < 0) t = 1;
        cv.px[i] = ramp[Math.min(ramp.length - 1, t)];
    }
}
/** 세운 원기둥(기둥, 통): 왼쪽 삼분의 일 밝게, 오른쪽 가장자리 어둡게, 외곽선. */
function column(cv, x, top, bottom, half, ramp, outline = ramp[0]) {
    for (let y = top; y <= bottom; y++) for (let xx = x - half; xx <= x + half; xx++) {
        const u = (xx - x + half) / Math.max(1, half * 2);
        const edge = xx === x - half || xx === x + half;
        cv.put(xx, y, edge ? outline : ramp[u < 0.3 ? 4 : u < 0.6 ? 3 : u < 0.85 ? 2 : 1]);
    }
}
module.exports = { sprite, shadow, lump, column };
