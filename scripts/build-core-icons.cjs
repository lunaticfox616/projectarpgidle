#!/usr/bin/env node
/* 코어 도트 아이콘(16×16 도트): 쇠 테를 두른 정육면체, 면 색은 코어의 첫 줄 계열(수호 · 저항 · 완화 · 파괴 · 기교)과 빈 칸.
 * 빛은 왼쪽 위 — 윗면이 가장 밝고 왼쪽 면 · 오른쪽 면 순으로 어둡다. 윗면 가운데에 작은 불씨 한 점.
 *
 *   node scripts/build-core-icons.cjs            # assets/px/cores/core-<계열>.png (6장)
 *
 * 게임은 16도트 그대로 불러 CSS에서 정수배(image-rendering: pixelated)로 키운다. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { encodePng } = require('./act-maps/raster.cjs');

const SIZE = 16;
const hex = value => parseInt(value.replace('#', ''), 16);
// 단계: 0 외곽선 · 1 어둠 · 2 중간 · 3 밝음 · 4 하이라이트
const RAMPS = {
    defense: ['#0e1c2c', '#1f3a58', '#3a6690', '#6a9cc8', '#bfe0f6'],
    resist: ['#0b2622', '#18504a', '#2c8a7c', '#5cc0ae', '#bff0e4'],
    mitigation: ['#1a1430', '#352a5e', '#5a4a96', '#8c7ac6', '#d6ccf4'],
    offense: ['#3a1208', '#7a2410', '#c4461c', '#f07a34', '#ffc27a'],
    utility: ['#4a3208', '#a0741c', '#e0b040', '#f4d470', '#fff0a0'],
    empty: ['#0e0e11', '#1f1f24', '#2c2c33', '#3c3c45', '#55555f']
};
const IRON = '#16161a';

function polygon(points) {
    return (x, y) => {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const [xi, yi] = points[i], [xj, yj] = points[j];
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
    };
}
const TOP = polygon([[8, 1.2], [14.8, 4.8], [8, 8.4], [1.2, 4.8]]);
const LEFT = polygon([[1.2, 4.8], [8, 8.4], [8, 14.8], [1.2, 11.2]]);
const RIGHT = polygon([[8, 8.4], [14.8, 4.8], [14.8, 11.2], [8, 14.8]]);
// 쇠 테: 세 면이 만나는 Y자 이음매.
const seam = (x, y) => (Math.abs(x - 8) < 0.5 && y > 8.2) || (Math.abs(y - (4.8 + (x - 1.2) * 3.6 / 6.8)) < 0.45 && x < 8)
    || (Math.abs(y - (8.4 - (x - 8) * 3.6 / 6.8)) < 0.45 && x > 8);
const EMBER = [[7, 4], [8, 4], [7, 5], [8, 5]];

function paint(ramp) {
    const rgb = new Int32Array(SIZE * SIZE), alpha = new Uint8Array(SIZE * SIZE);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const px = x + 0.5, py = y + 0.5, i = y * SIZE + x;
        const level = TOP(px, py) ? 3 : LEFT(px, py) ? 2 : RIGHT(px, py) ? 1 : -1;
        if (level < 0) continue;
        rgb[i] = seam(px, py) ? hex(IRON) : hex(ramp[level]);
        alpha[i] = 1;
    }
    for (const [x, y] of EMBER) rgb[y * SIZE + x] = hex(ramp[4]);
    outline(rgb, alpha, ramp);
    return { rgb, alpha };
}
/** One dot of the darkest tone around everything painted. */
function outline(rgb, alpha, ramp) {
    const edge = [];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        if (alpha[y * SIZE + x]) continue;
        const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
            const nx = x + dx, ny = y + dy;
            return nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE && alpha[ny * SIZE + nx];
        });
        if (touches) edge.push(y * SIZE + x);
    }
    for (const i of edge) { rgb[i] = hex(ramp[0]); alpha[i] = 1; }
}

function main() {
    const out = path.resolve(__dirname, '..', 'assets/px/cores');
    fs.mkdirSync(out, { recursive: true });
    for (const [name, ramp] of Object.entries(RAMPS)) {
        const { rgb, alpha } = paint(ramp);
        fs.writeFileSync(path.join(out, `core-${name}.png`), encodePng(rgb, SIZE, SIZE, alpha));
    }
    console.log(`코어 아이콘 ${Object.keys(RAMPS).length}장 → assets/px/cores/`);
}

if (require.main === module) main();
module.exports = { RAMPS, paint };
