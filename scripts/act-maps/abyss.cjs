'use strict';
/* 방 둘레의 어둠. 지은 액트는 고른 어둠. 허공 액트(떠 있는 판)는 판 가장자리를 밝게, 남쪽 가장자리마다 판 밑면
 * (흙과 뿌리, 깊을수록 한 단계씩 어둡게), 그 밖은 안개·꽃잎·별 하늘. */
const { P } = require('./pal.cjs');
const F = require('./ground.cjs');

const UNDER = 13;

/** 판 가장자리: 바닥의 테두리 점을 밝게(솟은 턱처럼) 해서 허공 위에서 판이 또렷하게. */
function rims(cv, g) {
    const { w, h } = cv;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!g.floor[i]) continue;
        const outN = !g.floor[i - w], outW = !g.floor[i - 1], outE = !g.floor[i + 1], outS = !g.floor[i + w];
        if (outN || outW) cv.px[i] = P.stone[5];
        else if (outE || outS) cv.px[i] = P.stone[2];
    }
}

/** 남쪽 가장자리 밑면: 판 두께(밝은 돌), 그 아래 흙과 뿌리가 단계로 어두워진다. */
function undersides(cv, g) {
    const { w, h } = cv, wob = cv.noise(4, 1101);
    g.under = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (g.floor[i]) continue;
        const depth = g.above[i], limit = UNDER - 3 + Math.round(wob[i] * 6);
        if (depth > limit) continue;
        g.under[i] = 1;
        let c;
        if (depth <= 2) c = P.stone[depth === 1 ? 3 : 2];
        else {
            const t = (depth - 3) / Math.max(1, limit - 3), strand = F.hash(x, 51) < 0.3;
            c = (strand ? P.wood : P.earth)[t < 0.34 ? 2 : t < 0.67 ? 1 : 0];
        }
        cv.px[i] = c;
    }
    danglingRoots(cv, g);
}
function danglingRoots(cv, g) {
    const { w, h } = cv;
    for (let x = 2; x < w - 2; x++) {
        if (F.hash(x, 61) > 0.06) continue;
        let y = 1;
        while (y < h && !(g.under[y * w + x] && !g.under[(y + 1 < h ? y + 1 : y) * w + x])) y++;
        if (y >= h - 1) continue;
        const len = 4 + Math.floor(F.hash(x, 62) * 14);
        for (let k = 1; k <= len && y + k < h && !g.floor[(y + k) * w + x]; k++) {
            const xx = x + Math.round(Math.sin((k + x) * 0.3) * 0.8);
            cv.put(xx, y + k, k > len - 3 ? P.wood[1] : P.wood[2]);
        }
    }
}

/** 바닥도, 밑면도, 벽도 아닌 곳의 하늘. */
const SKIES = {
    flat: () => P.dark[0],
    mist(cv, x, y, n) { // 옆으로 늘인 엷은 안개 띠
        const v = n.mist[y * cv.w + Math.floor(x / 4)];
        return v > 0.74 ? P.dark[2] : v > 0.62 ? P.dark[1] : P.dark[0];
    },
    petals(cv, x, y, n) {
        if (F.hash(x, y) < 0.0035) return P.wisteria[F.hash(y, x) < 0.5 ? 1 : 2];
        return (x * 7 + Math.floor(y / 3)) % 53 === 0 && F.hash(x, Math.floor(y / 9)) < 0.5 ? P.dark[2] : n.mist[y * cv.w + x] > 0.66 ? P.dark[1] : P.dark[0];
    },
    stars(cv, x, y, n) {
        const r = F.hash(x * 3, y * 5);
        if (r < 0.0025) return P.glow[4];
        if (r < 0.006) return P.glow[2];
        if (r < 0.009) return P.dark[2];
        return n.mist[y * cv.w + x] > 0.7 ? P.dark[2] : n.mist[y * cv.w + x] > 0.58 ? P.dark[1] : P.dark[0];
    }
};
function sky(cv, g, style) {
    const { w, h } = cv, n = { mist: cv.noise(16, 1111) };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (g.floor[i] || (g.under && g.under[i]) || (g.band && g.band[i]) || g.face[i]) continue;
        cv.px[i] = SKIES[style](cv, x, y, n);
    }
    if (style === 'stars') for (let k = Math.floor(w * h / 9000); k > 0; k--) { // 십자로 반짝이는 큰 별
        const x = cv.rng.int(2, w - 2), y = cv.rng.int(2, h - 2), i = y * w + x;
        if (g.floor[i] || (g.under && g.under[i])) continue;
        for (const [dx, dy, c] of [[0, 0, P.glow[4]], [1, 0, P.glow[2]], [-1, 0, P.glow[2]], [0, 1, P.glow[2]], [0, -1, P.glow[2]]]) {
            const k2 = (y + dy) * w + x + dx;
            if (!g.floor[k2] && !(g.under && g.under[k2])) cv.px[k2] = c;
        }
    }
}
/** 판 밑면 끝에서 늘어진 등나무꽃 줄기. */
function wisteriaCurtains(cv, g) {
    const { w, h } = cv, W = P.wisteria;
    for (let x = 1; x < w - 1; x++) {
        if (F.hash(x, 71) > 0.22) continue;
        let y = 0;
        while (y < h - 1) {
            const i = y * w + x;
            if (g.under && g.under[i] && !g.under[i + w] && !g.floor[i + w]) {
                const len = 3 + Math.floor(F.hash(x, y) * 9);
                for (let k = 1; k <= len && y + k < h && !g.floor[(y + k) * w + x]; k++) cv.px[(y + k) * w + x] = W[k > len - 2 ? 1 : (k + x) % 3 ? 3 : 2];
            }
            y++;
        }
    }
}
module.exports = { rims, undersides, sky, wisteriaCurtains };
