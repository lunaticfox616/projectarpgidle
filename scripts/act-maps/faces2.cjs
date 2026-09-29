'use strict';
/* 벽 앞면 둘째 묶음: bark(줄기 속 + 선반 버섯·등) · wisteria(등나무꽃 장막) · railing(뿌리 난간 + 꽃) · obsidian(흑요석 + 금선·별),
 * 그리고 윗면을 그린 뒤 벽 앞에 세우는 것(AFTER): 부러진 흰 자작나무(액트 6), 흑요석 첨탑(액트 10). */
const { faceIndices, groundShadow, columnRuns } = require('./faces.cjs');

function bark(cv, g, th, lights) {
    const fh = th.wall.faceH, groove = cv.noise(1.5, 63), vein = cv.noise(5, 64), vein2 = cv.noise(2, 65);
    for (const i of faceIndices(g)) {
        const k = g.below[i], x = i % cv.w;
        if (k === 1) { cv.px[i] = cv.pal.ink; continue; }
        cv.px[i] = cv.col('wood', 3 - (k > fh * 0.7) - ((x + Math.floor(groove[i] * 3)) % 5 === 0 ? 2 : 0));
        if (vein[i] > 0.8 && (x + Math.floor(vein2[i] * 4)) % 9 === 0) cv.px[i] = cv.col('teal', 3);
    }
    groundShadow(cv, g);
    if (th.wall.fungi) eachFaceSpot(cv, g, [14, 30], (x, base, height) => shelfFungus(cv, g, x, base - cv.rng.int(5, Math.max(6, height - 3))));
    eachFaceSpot(cv, g, [60, 90], (x, base) => { hangingLamp(cv, g, x, base - 11); lights.push([x, base - 8, 22, 'warm']); });
}

/** 앞면 열을 띄엄띄엄 골라 fn(x, 바닥 바로 위 y, 앞면 높이)를 부른다. */
function eachFaceSpot(cv, g, spacing, fn) {
    for (let x = cv.rng.int(...spacing); x < cv.w - 4; x += cv.rng.int(...spacing)) {
        for (const [top, bottom] of columnRuns(g.face, cv.w, cv.h, x)) if (bottom - top >= 8) fn(x, bottom, bottom - top + 1);
    }
}

/** 줄기에서 튀어나온 선반 버섯(반달 모양, 윗면 밝게). */
function shelfFungus(cv, g, cx, cy) {
    const rx = cv.rng.int(4, 7), ry = 3;
    for (let y = cy - ry; y <= cy + 1; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
        if (!cv.inside(x, y) || !g.face[y * cv.w + x]) continue;
        const v = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (y > cy) { if (Math.abs(x - cx) <= rx) cv.put(x, y, cv.pal.ink); continue; }
        if (v > 1.25) continue;
        cv.put(x, y, v > 1 ? cv.pal.ink : cv.col('leaf', y === cy ? 1 : y <= cy - ry + 1 ? 5 : 3 + (x < cx ? 1 : 0)));
    }
}

function hangingLamp(cv, g, x, y) {
    const rows = ['..k..', '..k..', '.kkk.', 'kyzyk', 'kxyxk', '.kkk.'];
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
        if (ch === '.') return;
        cv.put(x - 2 + c, y - 5 + r, ch === 'k' ? cv.pal.ink : cv.col('warm', { x: 2, y: 3, z: 4 }[ch]));
    }));
}

/** 등나무꽃 장막(액트 8): 어두운 벽 위로 위에서 늘어진 연보라 꽃송이. */
function wisteria(cv, g, th) {
    const fold = cv.noise(4, 66);
    for (const i of faceIndices(g)) {
        const k = g.below[i], x = i % cv.w;
        if (k === 1) { cv.px[i] = cv.pal.ink; continue; }
        cv.px[i] = cv.col('stone', Math.sin((x + fold[i] * 6) / 2.2) > 0.6 ? 2 : 1);
    }
    for (let x = cv.rng.int(0, 3); x < cv.w; x += cv.rng.int(2, 5)) {
        for (const [top, bottom] of columnRuns(g.face, cv.w, cv.h, x)) {
            const len = cv.rng.int(3, Math.max(4, bottom - top - 1));
            for (let j = 0; j < len; j++) {
                const xx = x + Math.round(Math.sin(j / 2 + x) * 0.7), yy = top + j;
                if (!cv.inside(xx, yy) || !g.face[yy * cv.w + xx]) continue;
                cv.put(xx, yy, cv.col('leaf', j > len - 3 ? 5 - (j === len - 1 ? 0 : 1) : j % 3 === 0 ? 2 : 3));
            }
        }
    }
    groundShadow(cv, g);
}

/** 뿌리 난간(액트 9): 어두운 잎 벽 앞에 굵은 뿌리 난간대와 기둥, 분홍 꽃송이. */
function railing(cv, g, th) {
    const fh = th.wall.faceH, leafN = cv.noise(3, 151);
    for (const i of faceIndices(g)) {
        const k = g.below[i], x = i % cv.w, post = x % 26;
        let c = k === 1 ? cv.pal.ink : cv.col('leaf', leafN[i] > 0.6 ? 1 : 0);
        if (k === fh - 7 || k === 4) c = cv.pal.ink;
        else if (k >= fh - 6 && k <= fh - 4) c = cv.col('wood', k === fh - 4 ? 4 : k === fh - 5 ? 3 : 1);
        else if (k === 5 || k === 6) c = cv.col('wood', k === 6 ? 3 : 1);
        if (post < 4 && k > 1 && k < fh - 3) c = post === 0 || post === 3 ? cv.pal.ink : cv.col('wood', post === 1 ? 3 : 2);
        cv.px[i] = c;
    }
    for (const i of faceIndices(g)) {
        const k = g.below[i];
        if ((k === fh - 5 || k === 6) && cv.rng.random() < 0.08) {
            const x = i % cv.w, y = Math.floor(i / cv.w);
            for (const [dx, dy, lv] of [[0, 0, 4], [1, 0, 3], [-1, 0, 3], [0, -1, 3], [0, 1, 2]]) if (g.face[(y + dy) * cv.w + x + dx]) cv.put(x + dx, y + dy, cv.col('teal', lv));
        }
    }
    groundShadow(cv, g);
}

/** 흑요석 블록(액트 10): 엇갈린 큰 돌, 위쪽 이중 금선, 박힌 별빛. */
function obsidian(cv, g, th) {
    const fh = th.wall.faceH;
    for (const i of faceIndices(g)) {
        const k = g.below[i], x = i % cv.w, row = Math.floor((k - 1) / 8), bx = (x + (row % 2) * 6) % 12;
        let c = k === 1 ? cv.pal.ink : bx === 0 || (k - 1) % 8 === 0 ? cv.col('stone', 0) : cv.col('stone', (k - 1) % 8 === 7 ? 2 : 1);
        if (k === fh - 3) c = cv.col('warm', 1); // 이중 금선: 흑요석에 섞이게 한 단계 낮춤
        else if (k === fh - 5) c = cv.col('warm', 0);
        else if (k >= fh) c = cv.col('stone', 3);
        else if (k > 1 && cv.rng.random() < 0.02) c = cv.col('teal', cv.rng.random() < 0.3 ? 4 : 3);
        cv.px[i] = c;
    }
    groundShadow(cv, g);
}

/** 벽 앞에 선 기둥 모양 물건: 앞면 아래(바닥 바로 위)에서 앞면 위로 extra도트 더 솟는다. */
function standing(cv, g, spacing, draw) {
    for (let x = cv.rng.int(...spacing); x < cv.w - 6; x += cv.rng.int(...spacing)) {
        for (const [top, bottom] of columnRuns(g.face, cv.w, cv.h, x)) if (bottom - top >= 8 && g.face[bottom * cv.w + x - 3] && g.face[bottom * cv.w + x + 3]) draw(x, bottom, bottom - top + 1);
    }
}

/** 부러진 흰 자작나무 줄기(액트 6): 가로 검은 껍질 무늬, 들쭉날쭉 부러진 끝, 밑동 뿌리. */
function birches(cv, g) {
    standing(cv, g, [46, 84], (x, base, faceH) => {
        const height = faceH + cv.rng.int(12, 28), jag = [3, 1, 0, 4, 2, 1, 3], marks = new Set();
        for (let y = base - height; y <= base; y++) if (cv.rng.random() < 0.16) marks.add(y);
        for (let c = -3; c <= 3; c++) {
            const top = base - height + jag[c + 3];
            for (let y = top; y <= base; y++) {
                const rim = c === -3 || c === 3 || y === top, mark = marks.has(y) && c > -2 && c < 2 + (y % 2);
                cv.put(x + c, y, rim || mark ? cv.pal.ink : cv.col('leaf', c < -1 ? 5 : c < 1 ? 4 : c < 2 ? 3 : 2));
            }
        }
        for (const side of [-1, 1]) for (let j = 0; j < 3; j++) { cv.put(x + side * (4 + j), base - (j === 0 ? 1 : 0), cv.col('wood', 2)); cv.put(x + side * (4 + j), base + 1, cv.pal.ink); }
    });
}

/** 흑요석 첨탑(액트 10): 아래 넓고 위로 가늘어지는 검은 돌, 금빛 끝. */
function spires(cv, g, th, lights) {
    standing(cv, g, [48, 80], (x, base, faceH) => {
        const height = faceH + cv.rng.int(12, 24);
        for (let y = base - height; y <= base; y++) {
            const t = (base - y) / height, half = Math.max(0, Math.round(3.5 * (1 - t)));
            for (let c = -half - 1; c <= half + 1; c++) {
                const rim = Math.abs(c) === half + 1;
                cv.put(x + c, y, rim ? cv.pal.ink : t > 0.9 ? cv.col('warm', 3) : cv.col('stone', c < 0 ? 3 : c === 0 ? 2 : 1));
            }
        }
        lights.push([x, base - height + 2, 14, 'warm']);
    });
}

const FACES = { bark, wisteria, railing, obsidian, none: () => {} };
const AFTER = { balustrade: (cv, g, th, lights) => th.wall.birch && birches(cv, g), obsidian: spires };

module.exports = { FACES, AFTER };
