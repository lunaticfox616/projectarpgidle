'use strict';
/* 북쪽 벽 앞면(절벽). rock(턱진 큰 바위) | masonry(깎은 돌 줄, arches면 아치 벽감) | bark(나무껍질 골) | shelves(책장).
 * 모두 발치로 갈수록 어둡고, 턱 바로 아래는 조금 밝고, 윗면에 이끼가 있으면 턱 너머로 걸치거나 가늘게 늘어진다. */
const { measure } = require('./terrain.cjs');
const { P } = require('./pal.cjs');
const F = require('./ground.cjs');
const { mossAt } = require('./bands.cjs');

/** 얇은 벽은 앞면 위에 윗면을 minTop도트 이상 남긴다(1칸 벽이 바닥 높이가 다른 단처럼 보이지 않게).
 * 너비 다섯 도트가 안 되는 앞면 조각(자연스러운 테두리의 계단)은 윗면으로 돌린다. */
function trimFaces(cv, g, minTop = 6) {
    const { w, h } = cv;
    for (let i = 0; i < w * h; i++) if (g.face[i] && g.above[i] < minTop + 1) g.face[i] = 0;
    for (let y = 0; y < h; y++) {
        let x = 0;
        while (x < w) {
            if (!g.face[y * w + x]) { x++; continue; }
            let end = x;
            while (end < w && g.face[y * w + end]) end++;
            if (end - x < 5) for (let k = x; k < end; k++) g.face[y * w + k] = 0;
            x = end;
        }
    }
    measure(cv, g);
}

/** 모든 모양이 같이 쓰는 명암: 턱 아래 밝은 줄, 발치 어둡게. */
function shadeFace(tone, g, i) {
    const b = g.below[i], ty = g.faceTop[i];
    if (ty < 3) tone += 1;
    if (b <= 2) return Math.min(tone, 1);
    return b <= 6 ? tone - 1 : tone;
}
function mossOver(cv, g, i, col, moss) {
    const x = i % cv.w, y = Math.floor(i / cv.w), ty = g.faceTop[i], drip = 2 + Math.floor(F.hash(x, 21) * 7);
    if (!moss || !mossAt(moss, cv.w, x, y - ty - 2)) return col;
    if (ty === 0 && F.hash(x, 22) < 0.6) return P.moss[3];
    if (ty < drip && F.hash(x, 23) < 0.3) return P.moss[ty < drip - 2 ? 2 : 1];
    return col;
}

function rockFaces(cv, g, moss) {
    const { w, h } = cv, near = F.voronoi(w, h, 10, 9, 83), fine = cv.noise(2, 984), id = new Int32Array(w * h).fill(-1);
    for (let i = 0; i < w * h; i++) if (g.face[i]) { const [c, gap] = near(i % w, Math.floor(i / w)); id[i] = gap < 1.2 ? -2 : c; }
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -3 : id[y * w + x]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, c = id[i];
        if (c === -1) continue;
        let tone;
        if (c === -2) tone = at(x + 1, y) >= 0 || at(x, y + 1) >= 0 ? 0 : 1; // 틈은 바위의 밝은 턱 밑에서 가장 깊다
        else {
            const tl = at(x - 1, y) !== c || at(x, y - 1) !== c, br = at(x + 1, y) !== c || at(x, y + 1) !== c, r = F.hash(c, 9);
            tone = shadeFace((r < 0.5 ? 3 : r < 0.85 ? 4 : 2) + (tl && !br ? 1 : br && !tl ? -1 : 0) + (!tl && !br && fine[i] > 0.86 ? 1 : 0), g, i);
        }
        if (c === -2 && g.below[i] <= 2) tone = 0;
        cv.px[i] = mossOver(cv, g, i, P.stone[F.clamp(tone, 0, 6)], moss);
    }
    for (let i = 0; i < id.length; i++) { // 틈에서 자란 풀
        if (id[i] !== -2 || g.faceTop[i] < 4 || g.below[i] < 5 || F.hash(i, 41) > 0.02) continue;
        const x = i % w, y = Math.floor(i / w);
        cv.put(x, y, P.moss[2]); cv.put(x - 1, y - 1, P.moss[3]); cv.put(x + 1, y - 1, P.moss[4]); cv.put(x, y - 2, P.moss[3]);
    }
}

/** 깎은 돌 줄: 턱에서 6도트마다 한 줄, 길이가 다른 돌, 돌마다 턱. */
function masonryFaces(cv, g, moss, opts) {
    const { w, h } = cv;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!g.face[i]) continue;
        const ty = g.faceTop[i], row = Math.floor(ty / 6), ly = ty % 6, shift = Math.floor(F.hash(row, 3) * 9);
        const bx = Math.floor((x + shift) / 12), lx = (x + shift) % 12, r = F.hash(bx * 7 + row, 5);
        let tone = (r < 0.5 ? 3 : r < 0.85 ? 4 : 2);
        if (ly === 5 || lx === 0) tone = 1; else if (ly === 0) tone += 1; else if (lx === 11 || ly === 4) tone -= 1;
        cv.px[i] = mossOver(cv, g, i, P.stone[F.clamp(shadeFace(tone, g, i), 0, 6)], moss);
    }
    if (opts.arches) arches(cv, g);
}
/** 넓은 앞면에 40도트마다 아치 벽감: 안은 어둡고 테는 밝고, 문턱에 한 단. */
function arches(cv, g) {
    const { w, h } = cv;
    for (let y = 1; y < h; y++) {
        let x = 0;
        while (x < w) {
            const i = y * w + x;
            if (!(g.face[i] && !g.face[i - w])) { x++; continue; }
            let end = x;
            while (end < w && g.face[y * w + end] && !g.face[(y - 1) * w + end]) end++;
            for (let cx = x + 20; cx + 8 < end; cx += 40) niche(cv, g, cx, y);
            x = end;
        }
    }
}
function niche(cv, g, cx, top) {
    const { w } = cv, half = 5;
    for (let yy = top + 3; yy < top + 40; yy++) for (let xx = cx - half - 1; xx <= cx + half + 1; xx++) {
        const i = yy * w + xx;
        if (!g.face[i] || g.below[i] <= 3) continue;
        const dx = xx - cx, archY = top + 3 + half - Math.round(Math.sqrt(Math.max(0, half * half - dx * dx)));
        if (yy < archY - 1 || Math.abs(dx) > half + 1) continue;
        const rim = yy === archY - 1 || Math.abs(dx) === half + 1;
        cv.px[i] = rim ? (dx < 0 || yy === archY - 1 ? P.stone[5] : P.stone[2]) : (dx < -half + 2 ? P.dark[2] : P.dark[1]);
        if (!rim && g.below[i] === 4) cv.px[i] = P.stone[3];
    }
}

/** 나무껍질: 물결치는 세로 골(왼쪽이 밝게), 어두운 고랑, 군데군데 옹이. */
function barkFaces(cv, g, moss) {
    const { w, h } = cv, wob = cv.noise(6, 1021);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!g.face[i]) continue;
        const u = x + wob[i] * 4, ridge = ((u % 6) + 6) % 6;
        let tone = ridge < 1 ? 1 : ridge < 2 ? 4 : ridge < 4 ? 3 : 2;
        if (F.hash(Math.floor(u / 6), Math.floor(y / 9)) > 0.93 && ridge > 1) tone = 1;
        cv.px[i] = mossOver(cv, g, i, P.wood[F.clamp(shadeFace(tone, g, i), 0, 5)], moss);
    }
}

/** 책장: 20도트마다 기둥, 7도트마다 선반, 액트 색의 책등, 가끔 빛나는 물약 한 줄. */
function shelfFaces(cv, g) {
    const { w, h } = cv, Wd = P.wood, B = P.book;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!g.face[i]) continue;
        const ty = g.faceTop[i], b = g.below[i], lx = x % 20, ly = (ty - 2) % 7, bay = Math.floor(x / 20) * 31 + Math.floor((ty - 2) / 7);
        let c;
        if (ty < 2) c = ty === 0 ? Wd[5] : Wd[4];
        else if (b <= 2) c = b === 1 ? Wd[0] : Wd[1];
        else if (lx === 0) c = Wd[0];
        else if (lx === 1) c = Wd[4];
        else if (lx === 19) c = Wd[1];
        else if (ly === 0) c = Wd[4];
        else if (ly === 1) c = Wd[1];
        else c = bookDot(x, ly, bay, B);
        cv.px[i] = c;
    }
}
function bookDot(x, ly, bay, B) {
    if (F.hash(bay, 77) < 0.12) return ly >= 3 && x % 4 === 1 ? (ly === 3 ? P.glow[4] : P.glow[2 + (ly % 2)]) : P.wood[0]; // 물약 한 줄
    const spine = Math.floor(x / 2), tall = 2 + Math.floor(F.hash(spine, bay) * 4);
    if (ly < 7 - tall || F.hash(spine, bay * 3) < 0.08) return P.wood[0];
    const col = B[Math.floor(F.hash(spine, bay * 5) * B.length)];
    return x % 2 ? col : (col & 0xfefefe) >> 1 | 0x101010; // 책등 오른쪽 절반은 조금 어둡게
}

function faces(cv, g, opts) {
    const moss = opts.moss === false ? null : cv.noise(7, 981);
    if (opts.style === 'rock') rockFaces(cv, g, moss);
    else if (opts.style === 'masonry') masonryFaces(cv, g, moss, opts);
    else if (opts.style === 'bark') barkFaces(cv, g, moss);
    else if (opts.style === 'shelves') shelfFaces(cv, g);
    if (opts.roots) hangingRoots(cv, g);
}

/** 턱 너머로 늘어진 뿌리: 왼쪽이 밝은 두 도트 줄기, 잔뿌리 한둘. */
function hangingRoots(cv, g) {
    const { w, h } = cv;
    for (let x = 3; x < w - 3; x++) {
        if (F.hash(x, 33) > 0.03) continue;
        let y = 1;
        while (y < h && !(g.face[y * w + x] && !g.face[(y - 1) * w + x])) y++;
        if (y >= h) continue;
        const len = 7 + Math.floor(F.hash(x, 34) * 12), branch = 3 + Math.floor(F.hash(x, 35) * (len - 4));
        for (let k = -2; k < len && y + k < h && (k < 0 || g.face[(y + k) * w + x]); k++) {
            const xx = x + Math.round(Math.sin((k + x * 3) * 0.18) * 1.2), thin = k > len - 4;
            cv.put(xx - 1, y + k, P.wood[0]); cv.put(xx, y + k, P.wood[thin ? 2 : 4]);
            if (!thin) { cv.put(xx + 1, y + k, P.wood[2]); cv.put(xx + 2, y + k, P.wood[0]); }
            if (k === branch) for (let t = 1; t <= 3; t++) cv.put(xx + 1 + t, y + k + t, P.wood[t === 3 ? 1 : 2]);
        }
    }
}
module.exports = { trimFaces, faces };
