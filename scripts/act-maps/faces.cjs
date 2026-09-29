'use strict';
/* 벽 앞면(북쪽 벽이 방 쪽으로 보이는 면). 디오라마의 벽을 정면으로 편 모양:
 * earth(흙벽+뿌리) · arches(고딕 아치+난간) · balustrade(난간, 아치 문) · library(나무 벽, 문·선반·물약·방패·등)
 * bark(줄기 속+선반 버섯) · wisteria(등나무꽃 장막) · railing(뿌리 난간+꽃) · obsidian(흑요석 블록+금선) · none.
 * k = 그 도트에서 바로 아래 바닥까지의 거리(1 = 바닥 바로 위). */

function faceIndices(g) {
    const out = [];
    for (let i = 0; i < g.face.length; i++) if (g.face[i]) out.push(i);
    return out;
}

/** 벽 밑동이 바닥에 드리우는 짧은 그늘. */
function groundShadow(cv, g) {
    const { w } = cv;
    for (const i of faceIndices(g)) {
        if (g.below[i] !== 1) continue;
        for (const s of [1, 2]) if (i + s * w < g.floor.length && g.floor[i + s * w]) cv.px[i + s * w] = cv.pal.shade(cv.px[i + s * w], s === 1 ? -2 : -1);
    }
}

function earth(cv, g, th) {
    const strata = cv.noise(3, 52), fh = th.wall.faceH;
    for (const i of faceIndices(g)) {
        const k = g.below[i], y = Math.floor(i / cv.w);
        cv.px[i] = k === 1 ? cv.pal.ink : k <= 4 ? cv.col('dirt', 1)
            : k <= fh - 6 ? cv.col('dirt', (y + Math.floor(strata[i] * 5)) % 5 ? 2 : 1) : cv.col('dirt', k < fh - 1 ? 1 : 0);
    }
    faceRoots(cv, g, th.wall.faceRoots || [6, 13]);
    groundShadow(cv, g);
}

/** 앞면을 타고 내려오는 세로 뿌리. 뿌리 발이 바닥으로 퍼진다. */
function faceRoots(cv, g, spacing, ramp = 'wood') {
    const { w, h } = cv, rng = cv.rng;
    for (let x = rng.int(...spacing); x < w; x += rng.int(...spacing)) {
        if (rng.random() < 0.3) continue;
        const runs = columnRuns(g.face, w, h, x);
        for (const [top, bottom] of runs) {
            if (bottom - top + 1 < 8 || rng.random() < 0.25) continue;
            const width = rng.int(2, 7), sway = rng.random() * 6, lean = rng.uniform(-0.35, 0.35);
            for (let yy = top; yy <= bottom; yy++) {
                const off = Math.round(Math.sin((yy + sway) / 4) * 0.8 + (yy - bottom) * lean);
                for (let j = -1; j <= width; j++) {
                    const xx = x + off + j;
                    if (xx < 0 || xx >= w || !g.face[yy * w + xx]) continue;
                    const rim = j === -1 || j === width;
                    cv.px[yy * w + xx] = rim ? (yy > top + 3 ? cv.pal.ink : cv.col('dirt', 0)) : cv.col(ramp, j === 0 ? 3 : j === width - 1 ? 1 : 2);
                }
            }
            for (const side of [-1, 1]) for (let j = rng.int(2, 5) - 1; j >= 0; j--) {
                const xx = x + (side > 0 ? width : -1) + side * j, yy = bottom + 1 + Math.floor(j / 2);
                if (cv.inside(xx, yy) && g.floor[yy * w + xx]) { cv.put(xx, yy, cv.col(ramp, 2)); cv.put(xx, yy + 1, cv.pal.ink); }
            }
        }
    }
}
function columnRuns(mask, w, h, x) {
    const runs = [];
    let start = -1;
    for (let y = 0; y <= h; y++) {
        const on = y < h && mask[y * w + x];
        if (on && start < 0) start = y;
        if (!on && start >= 0) { runs.push([start, y - 1]); start = -1; }
    }
    return runs;
}

/** 고딕 아치 줄(디오라마 액트 2): 금빛 부조 기둥, 뾰족한 아치 안의 어둠과 난간, 아치 돌, 위 벽. */
function arches(cv, g, th) {
    const fh = th.wall.faceH, period = 22, pillar = 6, half = (period - pillar) / 2, spring = fh - 12;
    for (const i of faceIndices(g)) {
        const k = g.below[i], x = i % cv.w, u = (x + 5) % period;
        if (k === 1) { cv.px[i] = cv.pal.ink; continue; }
        if (k <= 3) { cv.px[i] = cv.col('stone', k === 3 ? 3 : 1); continue; }
        if (k >= fh) { cv.px[i] = cv.col('stone', 4); continue; }
        if (u < pillar) { cv.px[i] = pillarPixel(cv, u, k, fh); continue; }
        const du = u - pillar - half + 0.5, top = spring + Math.sqrt(Math.max(0, half * half - du * du)) * 1.15;
        if (k <= top) cv.px[i] = archInside(cv, x, k);
        else if (k < top + 1.3) cv.px[i] = cv.pal.ink;
        else if (k < top + 3.5) cv.px[i] = Math.round(du + k) % 4 === 0 ? cv.col('stone', 1) : cv.col('stone', du < 0 ? 4 : 3);
        else cv.px[i] = (k + Math.floor(u / 4)) % 5 === 0 ? cv.col('stone', 1) : cv.col('stone', 2);
    }
    groundShadow(cv, g);
}
function pillarPixel(cv, u, k, fh) {
    if (u === 0 || u === 5) return cv.pal.ink;
    if ((u === 2 || u === 3) && k > 5 && k < fh - 3 && k % 6 === 0) return cv.col('warm', 2);
    if ((u === 2 || u === 3) && k > 5 && k < fh - 3 && k % 6 === 3) return cv.col('warm', 1);
    return cv.col('stone', u === 1 ? 4 : u === 4 ? 2 : 3);
}
/** 아치 안: 아래는 난간, 위는 어둠 속 늘어진 뿌리. */
function archInside(cv, x, k) {
    if (k === 8) return cv.col('stone', 3);
    if (k === 7) return cv.col('stone', 2);
    if (k === 4) return cv.col('stone', 1);
    if (k < 7) return x % 3 === 1 ? cv.col('stone', 2) : cv.col('leaf', 0);
    return (x * 7) % 5 === 0 && k > 10 ? cv.col('wood', 1) : cv.col('leaf', 0);
}

/** 돌난간(액트 5·6): 받침, 항아리 모양 난간동자, 손잡이, 그 너머는 어둠. 일정 간격 기둥, 선택으로 아치 문. */
function balustrade(cv, g, th, lights) {
    const fh = th.wall.faceH;
    for (const i of faceIndices(g)) {
        const k = g.below[i], x = i % cv.w;
        if (k === 1) { cv.px[i] = cv.pal.ink; continue; }
        if (th.wall.doors && x % 112 >= 48 && x % 112 < 68) { cv.px[i] = doorway(cv, (x % 112) - 48, k, fh); continue; }
        const post = x % 44;
        if (post < 6 && k <= 14) { cv.px[i] = post === 0 || post === 5 ? cv.pal.ink : cv.col('stone', k >= 13 ? 4 : post === 1 ? 4 : post === 4 ? 2 : 3); continue; }
        cv.px[i] = railPixel(cv, x, k);
    }
    groundShadow(cv, g);
    if (th.wall.doors) doorLights(cv, g, lights);
}
function railPixel(cv, x, k) {
    if (k <= 3) return cv.col('stone', k === 3 ? 3 : 2);
    if (k === 10) return cv.pal.ink;
    if (k === 11) return cv.col('stone', 3);
    if (k === 12) return cv.col('stone', 4);
    if (k > 12) return k === 13 ? cv.pal.ink : cv.col('dirt', 0);
    const u = x % 4, bulge = k === 6 || k === 7;
    if (u === 1) return cv.col('stone', 3);
    if (u === 2) return cv.col('stone', 2);
    if (bulge && u === 0) return cv.col('stone', 2);
    if (bulge && u === 3) return cv.col('stone', 1);
    return cv.col('dirt', 0);
}
/** 벽에 난 아치 문: 돌 문틀, 쐐기돌, 캄캄한 안쪽과 계단 두 줄. u = 0..19. */
function doorway(cv, u, k, fh) {
    const du = u - 9.5, top = fh - 8 + Math.sqrt(Math.max(0, 49 - du * du)) * 0.9;
    if (u < 3 || u > 16) return u === 0 || u === 19 ? cv.pal.ink : cv.col('stone', u < 3 ? 4 : 2);
    if (k <= top) return k <= 3 ? cv.col('stone', k === 3 ? 2 : 1) : cv.col('dirt', 0);
    if (k < top + 1.3) return cv.pal.ink;
    return Math.abs(du) < 1.5 && k < top + 4 ? cv.col('stone', 5) : cv.col('stone', 3);
}
function doorLights(cv, g, lights) {
    for (let x = 58; x < cv.w; x += 112) {
        for (let y = 0; y < cv.h; y++) if (g.face[y * cv.w + x] && g.below[y * cv.w + x] === 1) lights.push([x, y - 6, 18, 'warm']);
    }
}

/** 나무 벽(액트 4): 세로 널 + 걸레받이·처마, 그 위에 차례로 아치 문·물약 선반·방패·벽등. */
function library(cv, g, th, lights) {
    const fh = th.wall.faceH, grain = cv.noise(2, 141);
    for (const i of faceIndices(g)) {
        const k = g.below[i], x = i % cv.w, slot = Math.floor(x / 26) % 5, u = x % 26;
        if (k === 1) { cv.px[i] = cv.pal.ink; continue; }
        const feature = FEATURES[['door', 'shelf', 'shield', 'shelf', 'lamp'][slot]](cv, u, k, fh);
        if (feature !== null) { cv.px[i] = feature; continue; }
        if (k <= 3) { cv.px[i] = cv.col('wood', k === 3 ? 3 : 1); continue; }
        if (k >= fh - 1) { cv.px[i] = cv.col('wood', k >= fh ? 4 : 1); continue; }
        cv.px[i] = x % 6 === 0 ? cv.col('wood', 0) : cv.col('wood', grain[i] > 0.7 ? 2 : 1);
    }
    for (let x = 4 * 26 + 13; x < cv.w; x += 5 * 26) {
        for (let y = 0; y < cv.h; y++) if (g.face[y * cv.w + x] && g.below[y * cv.w + x] === 1) lights.push([x, y - 14, 24, 'warm']);
    }
    faceRoots(cv, g, [18, 34]);
    groundShadow(cv, g);
}
const FEATURES = {
    door(cv, u, k, fh) {
        if (u < 5 || u > 20) return null;
        const du = u - 12.5, top = fh - 7 + Math.sqrt(Math.max(0, 30 - du * du));
        if (k > top + 1.5) return null;
        if (k > top || u === 5 || u === 20) return cv.pal.ink;
        if (u === 6 || u === 19) return cv.col('stone', 3);
        if (u === 12 || u === 13) return k === 9 ? cv.col('warm', 2) : cv.col('leaf', 0);
        return (u + (k > 11 ? 1 : 0)) % 3 === 0 ? cv.col('leaf', 1) : cv.col('leaf', k > fh - 6 ? 3 : 2);
    },
    shelf(cv, u, k) {
        if (u < 4 || u > 21) return null;
        if (k === 9) return cv.col('wood', 4);
        if (k === 8) return cv.pal.ink;
        if (k >= 10 && k <= 14) return bottle(cv, u, k);
        return null;
    },
    shield(cv, u, k) {
        const du = Math.abs(u - 13), top = 19, bottom = 11 + Math.floor(du * 0.9);
        if (du > 4 || k > top || k < bottom) return null;
        if (du === 4 || k === top || k === bottom) return cv.pal.ink;
        return du <= 1 && k > 13 && k < 18 ? cv.col('warm', 2) : cv.col('leaf', du < 2 ? 3 : 2);
    },
    lamp(cv, u, k) {
        if (u < 11 || u > 15 || k < 12 || k > 18) return null;
        if (k === 12 || u === 11 || u === 15) return cv.pal.ink;
        if (k >= 16) return cv.col('stone', 3);
        return cv.col('warm', k === 15 ? 4 : u === 13 ? 4 : 3);
    }
};
/** 선반 위 물약 세 병: 초록(teal)·호박(warm)·붉은(leaf), 코르크와 외곽선. */
function bottle(cv, u, k) {
    const slots = [[6, 'teal', 13], [11, 'warm', 14], [16, 'leaf', 12]];
    for (const [cx, ramp, height] of slots) {
        const du = u - cx, side = Math.abs(du);
        if (side > 2 || k > height) continue;
        if (k === height) return du === 0 ? cv.col('wood', 3) : null;
        if (k === height - 1) return du === 0 ? cv.col(ramp, 3) : side === 1 ? cv.pal.ink : null;
        if (side === 2) return cv.pal.ink;
        return cv.col(ramp, du < 0 ? 4 : du === 0 ? 3 : 2);
    }
    return null;
}

module.exports = { faceIndices, groundShadow, faceRoots, columnRuns, earth, arches, balustrade, library };
