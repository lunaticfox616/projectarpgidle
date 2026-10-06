#!/usr/bin/env node
/* 웨이브 콘텐츠 판 배경(2026-10-06 사용자 요청: 웨이브 콘텐츠에도 전용 맵 디자인): 벌집 원정, 군락지처럼 9×8 판에서 싸우는 콘텐츠는
 * 원소에 맞는 액트 판 그림을 빌려 썼다. 액트 지도와 같은 도구(scripts/build-act-maps.cjs build, 칸 16도트)로 19×13칸 판을 그리고
 * 3배로 키워 액트 판 그림과 같은 규격(912×624, 9×8 칸이 (240,144)부터 48px, data/maps.js ACT_BATTLE_MAP_LAYOUT)으로 쓴다.
 * 바닥은 전투 칸 9×8뿐이고 둘레는 벽이라, 판 밖을 걸을 수 있는 땅으로 오해하지 않는다. 모양과 색은 looks.cjs · pal.cjs의 board-* 키.
 *
 *   node scripts/build-board-backdrops.cjs           # 미리보기: artifacts/board-backdrops/
 *   node scripts/build-board-backdrops.cjs --write   # assets/background/boards-20261006/<key>.png 교체 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('./build-act-maps.cjs');
const { encodePng } = require('./act-maps/raster.cjs');

const root = path.resolve(__dirname, '..');
const BOARDS = Object.freeze([
    { key: 'bgBeehive', look: 'board-hive' },
    { key: 'bgColony', look: 'board-colony' }
]);
// 912×624를 48px로 나누면 19×13칸이고, 전투 칸 9×8은 (5,3)부터다. 칸 16도트로 그려 3배로 키운다.
const GRID = Object.freeze({ columns: 19, rows: 13, x0: 5, y0: 3, cols: 9, rowsIn: 8, scale: 3 });

/** The 9×8 fighting cells as floor, everything around them wall; two touching rooms so the painter dresses both halves. */
function boardLayout(look) {
    const tiles = Array(GRID.columns * GRID.rows).fill(0);
    for (let y = GRID.y0; y < GRID.y0 + GRID.rowsIn; y++) for (let x = GRID.x0; x < GRID.x0 + GRID.cols; x++) tiles[y * GRID.columns + x] = 1;
    const cx = GRID.x0 + (GRID.cols - 1) / 2;
    const rooms = [
        { id: 'north', gx: cx, gy: GRID.y0 + 1, radiusX: 4, radiusY: 1, role: 'battle' },
        { id: 'south', gx: cx, gy: GRID.y0 + 5, radiusX: 4, radiusY: 2, role: 'battle' }
    ];
    return { id: look, look, columns: GRID.columns, rows: GRID.rows, tiles, rooms, links: [['north', 'south']], rotation: 0 };
}

function upscale(px, w, h, k) {
    const out = new Int32Array(w * k * h * k);
    for (let y = 0; y < h * k; y++) for (let x = 0; x < w * k; x++) out[y * w * k + x] = px[Math.floor(y / k) * w + Math.floor(x / k)];
    return out;
}

function main() {
    const write = process.argv.includes('--write');
    const out = write ? path.join(root, 'assets/background/boards-20261006') : path.join(root, 'artifacts/board-backdrops');
    fs.mkdirSync(out, { recursive: true });
    for (const board of BOARDS) {
        const started = Date.now(), { cv, stray } = build(boardLayout(board.look), { gate: false });
        const big = upscale(cv.px, cv.w, cv.h, GRID.scale);
        fs.writeFileSync(path.join(out, `${board.key}.png`), encodePng(big, cv.w * GRID.scale, cv.h * GRID.scale));
        console.log(`${board.key} (${board.look}): ${cv.w * GRID.scale}×${cv.h * GRID.scale}, 벽에 걸친 소품 ${stray}, ${Date.now() - started}ms`);
    }
    console.log(write ? '→ assets/background/boards-20261006/ 에 썼습니다.' : `→ 미리보기: ${path.relative(root, out)}/ (게임에 넣으려면 --write)`);
}

main();
