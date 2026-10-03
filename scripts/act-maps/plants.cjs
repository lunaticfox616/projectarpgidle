'use strict';
/* 식물 소품: 자작나무(쓰러진 통나무, 부러진 밑동), 마른 풀, 선반 버섯, 꽃나무, 등나무. */
const { P } = require('./pal.cjs');
const { sprite, shadow } = require('./sprite.cjs');

/** 쓰러진 자작나무: 위가 밝은 흰 통나무, 검은 무늬, 나이테가 보이는 단면, 쪼개진 끝, 마른 가지 둘. */
function birchLog(cv, x, y) {
    shadow(cv, x + 2, y + 2, 15, 2.8, 0.4);
    const B = P.birch, len = 24, x0 = x - len / 2, seed = x * 7 + y;
    for (let k = 0; k < len; k++) for (let r = -3; r <= 2; r++) {
        const xx = x0 + k, yy = y - 3 + r, edge = r === -3 || r === 2;
        let c = edge ? B[0] : r === -2 ? B[4] : r <= 0 ? B[3] : B[2];
        if (!edge && (k * 3 + seed) % 7 === 0 && r > -2 && r < 2) c = B[0];
        cv.put(xx, yy, c);
    }
    sprite(cv, ['.oo.', 'oWwo', 'owWo', 'oWwo', '.oo.'], x0, y, { o: B[0], W: P.wood[4], w: P.wood[2] });
    sprite(cv, ['o.o', 'WoW', 'oWo', 'W.o', 'o..'], x0 + len, y, { o: B[0], W: P.wood[3] });
    for (const [kx, dir] of [[8, -1], [16, 1]]) for (let k = 1; k <= 4; k++) cv.put(x0 + kx + k, y - 6 - k * (dir < 0 ? 1 : 0) + (dir > 0 ? -k + 2 : 0), B[1]);
}
/** 자작나무: 셋에 둘은 쓰러진 통나무, 나머지는 부러진 밑동(검은 무늬, 들쭉날쭉한 단면, 마른 가지, 마른 풀). */
function birch(cv, x, y) {
    if ((x * 31 + y * 17) % 3 !== 0) return birchLog(cv, x, y);
    shadow(cv, x + 4, y + 1, 9, 2.4);
    const B = P.birch, tall = 10 + Math.floor((x * 7 + y) % 5), seed = x * 13 + y;
    for (let yy = y - tall; yy <= y; yy++) for (let xx = x - 3; xx <= x + 3; xx++) {
        const u = xx - x, edge = Math.abs(u) === 3;
        let c = edge ? B[0] : u <= -1 ? B[4] : u <= 1 ? B[3] : B[2];
        const dash = (yy * 3 + seed) % 7 === 0 && u > -2 && u < 2;
        if (!edge && dash) c = B[0]; else if (!edge && (yy * 5 + u + seed) % 11 === 0) c = B[1];
        cv.put(xx, yy, c);
    }
    sprite(cv, ['o.o..o.', 'oWoo.oWo', '.oWWoWo.'], x, y - tall + 2, { o: B[0], W: P.wood[3] });
    for (const [dx, dir, at] of [[-3, -1, 7], [3, 1, 11]]) for (let k = 1; k <= 5; k++) {
        cv.put(x + dx + dir * k, y - tall + at - k, B[1]);
        if (k === 3) cv.put(x + dx + dir * (k + 1), y - tall + at - k - 2, B[1]);
    }
    sprite(cv, ['o.......o', 'ro.....or', '.rr...rr.'], x, y + 1, { o: B[0], r: B[1] });
    if (P.grass) sprite(cv, ['l...l..l', '.d.ldld.', 'dddddddd'], x + 2, y + 2, { l: P.grass[5], d: P.grass[3] });
}
function dryGrass(cv, x, y) {
    const G = P.grass;
    sprite(cv, ['.l...l..', 'l.d.l.d.', '.d.dd.d.', 'dd.ddd.d', '.dddddd.'], x, y + 1, { l: G[5], d: G[3] });
}
/** 나무껍질 벽에 붙은 선반 버섯. */
function shelfFungus(cv, x, y) {
    const Fn = P.fungus;
    sprite(cv, ['..oooooo..', '.oLLLLLLo.', 'oLlllLLLdo', '.oddddddo.', '..oooooo..'], x, y, { o: Fn[0], L: Fn[3], l: Fn[4], d: Fn[1] });
}
/** 두 가지로 갈라지는 줄기(두 도트 굵기, 왼쪽 밝게, 외곽선). */
function forkTrunk(cv, x, y, tall) {
    const Wd = P.wood;
    for (let yy = y - tall; yy <= y; yy++) { cv.put(x - 2, yy, Wd[0]); cv.put(x - 1, yy, Wd[4]); cv.put(x, yy, Wd[2]); cv.put(x + 1, yy, Wd[0]); }
    for (const dir of [-1, 1]) for (let k = 0; k < 7; k++) {
        const bx = x + dir * (1 + k), by = y - tall - k;
        cv.put(bx, by, Wd[k < 5 ? 3 : 2]); cv.put(bx, by + 1, Wd[0]);
    }
    sprite(cv, ['o...o', '.o.o.'], x, y + 1, { o: Wd[0] });
}
/** 꽃 무더기 수관: 어두운 잎 바탕에 작은 분홍 꽃을 촘촘히, 왼쪽 위가 밝게. */
function blossomCrown(cv, cx, cy, rx, ry) {
    const B = P.blossom;
    for (let yy = Math.floor(cy - ry - 1); yy <= cy + ry + 1; yy++) for (let xx = Math.floor(cx - rx - 1); xx <= cx + rx + 1; xx++) {
        const dx = (xx - cx) / rx, dy = (yy - cy) / ry, d = dx * dx + dy * dy;
        if (d > 1.15) continue;
        if (d > 1) { cv.put(xx, yy, B[0]); continue; }
        const light = -dx * 0.5 - dy, flower = ((xx * 3 + yy * 5) % 4 === 0) || ((xx + yy * 3) % 7 === 0);
        cv.put(xx, yy, flower ? B[light > 0.2 ? 4 : 3] : B[light > 0.5 ? 3 : light > -0.3 ? 2 : 1]);
    }
}
function blossomTree(cv, x, y) {
    shadow(cv, x + 4, y + 1, 12, 3);
    forkTrunk(cv, x, y, 12);
    blossomCrown(cv, x - 5, y - 19, 7, 5);
    blossomCrown(cv, x + 5, y - 21, 7, 5);
    blossomCrown(cv, x, y - 25, 6, 4);
    for (let k = 0; k < 5; k++) cv.put(x - 8 + k * 4, y + 2 + (k % 2), P.blossom[3]);
}
/** 등나무: 갈라진 줄기, 어두운 잎 지붕, 그 밑에 늘어진 꽃송이(위는 연하고 끝은 진하게). */
function wisteriaTree(cv, x, y) {
    shadow(cv, x + 4, y + 1, 12, 3);
    forkTrunk(cv, x, y, 13);
    const M = P.moss, W = P.wisteria;
    for (let yy = y - 27; yy <= y - 19; yy++) for (let xx = x - 11; xx <= x + 11; xx++) {
        const dx = (xx - x) / 11, dy = (yy - (y - 23)) / 4.5, d = dx * dx + dy * dy;
        if (d > 1) continue;
        cv.put(xx, yy, d > 0.8 ? M[0] : M[(xx + yy) % 3 ? 2 : 3]);
    }
    for (let k = -10; k <= 10; k += 2) {
        const len = 5 + ((k * 7 + x) % 5 + 5) % 5, top = y - 21 + Math.round(Math.abs(k) / 5);
        for (let d = 0; d < len; d++) { cv.put(x + k, top + d, W[d < 2 ? 4 : d < len - 2 ? 3 : 1]); if (d % 2 === 0) cv.put(x + k + 1, top + d, W[2]); }
    }
}
module.exports = { birch, dryGrass, shelfFungus, blossomTree, wisteriaTree };
