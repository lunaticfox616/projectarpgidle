#!/usr/bin/env node
/* 로그인 화면에 흩날리는 금빛 나뭇잎(2026-11-05 사용자 "로그인화면에 금빛 나뭇잎이 흩날리게 해줄 수 있어?")의 도트 그림을 만든다.
 *
 *   node scripts/build-title-leaves.cjs
 *
 * 그림: assets/ui/title-leaves.png. 한 칸 15×15 도트, 가로 12칸이 한 바퀴(css/startup.css가 steps(12)로 넘긴다).
 *   첫 줄: 갸름한 잎이 한 바퀴 돌며 두 번 뒤집힌다(앞면 금빛, 뒷면 어두운 금빛).
 *   둘째 줄: 둥근 잎이 좌우로 흔들리며 반쯤 뒤집혔다 돌아온다.
 * 색은 배경 세계수(assets/background/title-worldtree-v1.webp) 잎의 금빛에서 골랐다. 칸마다 잎 모양을 그 각도로 도트에 다시 찍으므로
 * 그림을 돌리거나 늘이지 않는다. 같은 일을 다시 해도 결과가 같다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { encodePng } = require('./lib/png.cjs');

const CELL = 15, FRAMES = 12, ROWS = 2;
const hex = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
const FRONT = { edge: hex('#6b4714'), body: hex('#c38d2c'), light: hex('#e6b64c'), shine: hex('#f8dc86'), rib: hex('#8f5f1e') };
const BACK = { edge: hex('#553810'), body: hex('#9a6c24'), light: hex('#b8862e'), shine: hex('#d4a446'), rib: hex('#c38d2c') };

/** 잎 모양: 길이 len, 너비 wide, 가장 넓은 자리 widest(밑동 0 ~ 끝 1), 끝으로 좁아지는 정도 taper. 그 칸의 돌림(rad)과 뒤집힘(앞면 1 ~ 옆모습 0 ~ 뒷면 -1). */
const LEAVES = [
    { len: 12, wide: 7, widest: 0.38, taper: 1.25, pose: k => ({ turn: k * Math.PI / 6, flip: Math.cos(k * Math.PI / 3) }) },
    { len: 11, wide: 8, widest: 0.42, taper: 1.05, pose: k => ({ turn: -0.35 + 0.7 * Math.sin(k * Math.PI / 6), flip: 0.2 + 0.8 * Math.cos(k * Math.PI / 6) }) }
];

/** 잎의 자리 (u: 밑동 0 ~ 끝 1, v: 가운데 줄에서 옆으로 잰 도트)가 잎 안이면 'leaf', 꼭지면 'stem', 밖이면 null.
 * 밑동은 둥글고 끝 하나만 뾰족한 물방울꼴이다(양쪽이 다 뾰족하면 가운데 줄과 이어져 고리 두른 공처럼 보였다). */
function partAt(leaf, u, v) {
    if (u >= 0 && u <= 1) {
        const half = (leaf.wide / 2) * (u <= leaf.widest ? Math.sqrt(Math.sin((Math.PI / 2) * (u / leaf.widest))) : Math.pow((1 - u) / (1 - leaf.widest), leaf.taper));
        if (Math.abs(v) <= half) return 'leaf';
    }
    if (u < 0 && u >= -1.2 / leaf.len && Math.abs(v) <= 0.75) return 'stem';
    return null;
}

/** 비스듬한 각도에서 잎과 떨어져 혼자 찍힌 꼭지 도트를 지운다: 잎에, 또는 잎에 붙은 꼭지에 닿은(여덟 방향) 꼭지만 남긴다. */
function dropLooseStem(part) {
    const touches = (at, kinds) => [-1, 0, 1].some(oy => [-1, 0, 1].some(ox => {
        const x = (at % CELL) + ox, y = Math.floor(at / CELL) + oy;
        return (ox || oy) && x >= 0 && y >= 0 && x < CELL && y < CELL && kinds.includes(part[y * CELL + x]);
    }));
    const stems = part.map((what, at) => (what === 'stem' ? at : -1)).filter(at => at >= 0);
    const near = new Set(stems.filter(at => touches(at, ['leaf'])));
    stems.forEach(at => { if (!near.has(at)) part[at] = 'loose'; });
    stems.forEach(at => { if (!near.has(at) && touches(at, ['stem'])) part[at] = 'stem'; });
    stems.forEach(at => { if (part[at] === 'loose') part[at] = null; });
}

/** 한 칸: 칸의 도트마다 잎 쪽 좌표로 되돌려 잎 안인지 보고, 테두리, 가운데 잎맥, 빛 받는 쪽, 반짝임을 칠한다. */
function drawFrame(leaf, k) {
    const { turn, flip } = leaf.pose(k), side = flip < 0 ? -1 : 1, squash = Math.max(0.3, Math.abs(flip)), ink = side > 0 ? FRONT : BACK;
    const cos = Math.cos(turn), sin = Math.sin(turn), mid = CELL / 2;
    const part = [], local = [];
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
        const dx = x + 0.5 - mid, dy = y + 0.5 - mid;
        const along = dx * cos + dy * sin, across = (-dx * sin + dy * cos) / squash;
        const u = along / leaf.len + 0.5;
        part.push(partAt(leaf, u, across));
        local.push({ u, across: across * side, screenAcross: -dx * sin + dy * cos });
    }
    const inside = (x, y) => x >= 0 && y >= 0 && x < CELL && y < CELL && part[y * CELL + x] === 'leaf';
    dropLooseStem(part);
    const pixels = [];
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
        const at = y * CELL + x, what = part[at], spot = local[at];
        if (!what) { pixels.push(null); continue; }
        if (what === 'stem') { pixels.push(ink.edge); continue; }
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        if (edge) pixels.push(ink.edge);
        else if (Math.abs(spot.screenAcross) < 0.5 && spot.u > 0.12 && spot.u < 0.86 && squash > 0.45) pixels.push(ink.rib);
        else if (spot.across < 0 && spot.u > 0.45 && spot.u < 0.72 && squash > 0.6) pixels.push(ink.shine);
        else pixels.push(spot.across < 0 ? ink.light : ink.body);
    }
    return pixels;
}

const width = CELL * FRAMES, height = CELL * ROWS, out = Buffer.alloc(width * height * 4);
LEAVES.forEach((leaf, row) => {
    for (let k = 0; k < FRAMES; k++) {
        drawFrame(leaf, k).forEach((colour, at) => {
            if (!colour) return;
            const x = k * CELL + (at % CELL), y = row * CELL + Math.floor(at / CELL), i = (y * width + x) * 4;
            out[i] = colour[0]; out[i + 1] = colour[1]; out[i + 2] = colour[2]; out[i + 3] = 255;
        });
    }
});
const file = path.join(__dirname, '..', 'assets/ui/title-leaves.png');
fs.writeFileSync(file, encodePng(width, height, out));
console.log(`${path.relative(process.cwd(), file)}: ${width}x${height}`);
