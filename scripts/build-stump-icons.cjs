#!/usr/bin/env node
/* 그루터기 함 아이템 도트 아이콘(16×16 도트): 씨앗·새싹·꽃·열매 / 수액·송진·호박석 × 화염·냉기·번개·카오스,
 * 부적(깨어남 · 잠듦) × 마법 · 희귀 · 고유, 불씨의 흉터(깨어남 ember · 잠듦 ash, 2026-10-08 포식).
 * 모양을 도트 칸 가운데에서 재서 칠하고(빛은 왼쪽 위), 바깥 한 도트를 그 색의 가장 어두운 단계로 두른다.
 *
 *   node scripts/build-stump-icons.cjs            # assets/px/stump/<모양>-<색>.png (28장) + 부적 <talisman|sealed>-<희귀도>.png (6장)
 *                                                 # + 흉터 scar-<ember|ash>.png (2장)
 *
 * 게임은 16도트 그대로 불러 CSS에서 정수배(image-rendering: pixelated)로 키운다. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { encodePng } = require('./act-maps/raster.cjs');

const SIZE = 16;
const hex = value => parseInt(value.replace('#', ''), 16);
// 단계: 0 외곽선 · 1 어둠 · 2 중간 · 3 밝음 · 4 하이라이트
const COLORS = {
    fire: ['#3a1208', '#7a2410', '#c4461c', '#f07a34', '#ffc27a'],
    cold: ['#0e2238', '#1e4a78', '#2f7cc0', '#6cb8ec', '#cdeeff'],
    lightning: ['#3a2e06', '#7a6010', '#c49a1a', '#f0cc3a', '#fff3a8'],
    chaos: ['#1e0c2e', '#45205e', '#7a3aa6', '#b070dc', '#e8c8ff']
};
const LEAF = ['#0f2410', '#1e4a1c', '#3a7a2a', '#6aae40', '#a6d870'];
const BARK = ['#2a1a0e', '#5a3a1e', '#8a5a2e', '#b07a44', '#d8a868'];
const GOLD = ['#4a3208', '#a0741c', '#e0b040', '#f4d470', '#fff0a0'];
// 부적: 빛바랜 종이와 희귀도 먹색(원소 색과 겹치지 않게 푸른 회색 · 누런 금 · 붉은 주황).
const PAPER = ['#2a2014', '#6e5a3c', '#a8926a', '#d2c098', '#eee2c4'];
const RARITIES = {
    magic: ['#141c2c', '#2c3e5e', '#4a6a9a', '#8fa9d6', '#c8d8f0'],
    rare: ['#2e2408', '#6a5418', '#a88a2c', '#d8bc58', '#f6e6a4'],
    unique: ['#2e1206', '#6a2a10', '#aa4a1e', '#dc7a3c', '#f8c08a']
};

/** A painted part: inside(x, y) test and the ramp it uses; light comes from the upper left of its own centre. */
function ellipse(cx, cy, rx, ry, turn = 0) {
    const c = Math.cos(turn), s = Math.sin(turn);
    return (x, y) => {
        const dx = x - cx, dy = y - cy, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry;
        return u * u + v * v <= 1;
    };
}
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
const union = (...parts) => (x, y) => parts.some(part => part(x, y));
function line(x0, y0, x1, y1, width) {
    return (x, y) => {
        const dx = x1 - x0, dy = y1 - y0, t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
        return Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t)) <= width / 2;
    };
}

/** Shape → list of { inside, ramp, cx, cy, r } drawn in order (later parts on top). */
const SHAPES = {
    seed: ramp => [{ inside: ellipse(8, 8.6, 3.4, 5.2, -0.5), ramp, cx: 8, cy: 8.6, r: 5, vein: [[6, 12.2], [10, 5]] }],
    sprout: ramp => [
        { inside: line(8.5, 9, 8.5, 3.6, 1.2), ramp: LEAF, cx: 8, cy: 6, r: 3, flat: 2 },
        { inside: ellipse(5.6, 5.2, 2.6, 1.3, -0.5), ramp: LEAF, cx: 5.6, cy: 5.2, r: 2.4 },
        { inside: ellipse(11.2, 4.4, 2.6, 1.3, 0.45), ramp: LEAF, cx: 11.2, cy: 4.4, r: 2.4 },
        { inside: ellipse(8, 11.4, 3.2, 3, -0.3), ramp, cx: 8, cy: 11.4, r: 3.2 }
    ],
    flower: ramp => [
        { inside: line(8, 9, 8, 15, 1.2), ramp: LEAF, cx: 8, cy: 12, r: 3, flat: 2 },
        ...[0, 1, 2, 3, 4].map(k => {
            const a = k / 5 * Math.PI * 2 - Math.PI / 2, x = 8 + Math.cos(a) * 3.5, y = 7.4 + Math.sin(a) * 3.5;
            return { inside: ellipse(x, y, 2.7, 2.7), ramp, cx: x, cy: y, r: 2.7 };
        }),
        { inside: ellipse(8, 7.4, 1.9, 1.9), ramp: GOLD, cx: 8, cy: 7.4, r: 1.9 }
    ],
    fruit: ramp => [
        { inside: line(8.2, 5.4, 7.6, 2.4, 1.1), ramp: BARK, cx: 8, cy: 4, r: 2, flat: 2 },
        { inside: ellipse(11, 3.6, 2.7, 1.3, 0.5), ramp: LEAF, cx: 11, cy: 3.6, r: 2.4 },
        { inside: ellipse(8, 9.8, 5.2, 4.9), ramp, cx: 8, cy: 9.8, r: 5 }
    ],
    sap: ramp => [{ inside: union(ellipse(8, 10.6, 3.6, 3.6), polygon([[8, 3.2], [11.1, 9.4], [4.9, 9.4]])), ramp, cx: 8, cy: 9.6, r: 4.4 }],
    resin: ramp => [{ inside: union(ellipse(8, 9.6, 4.8, 4.8), polygon([[8, 1.4], [12.2, 8], [3.8, 8]])), ramp, cx: 8, cy: 9, r: 5.6, glint: true }],
    amber: ramp => [{ inside: polygon([[8, 1.5], [13.6, 4.8], [13.6, 11.2], [8, 14.5], [2.4, 11.2], [2.4, 4.8]]), ramp, cx: 8, cy: 8, r: 6, facets: true }]
};
/** 부적 종이 한 장과 먹 글씨(둥근 인장 · 세로 획 · 짧은 가로 획 둘). 잠든 부적은 글씨가 어둡고 끈으로 묶였다. */
const paper = () => ({ inside: polygon([[4.6, 1.4], [11.4, 1.4], [11.4, 14.6], [4.6, 14.6]]), ramp: PAPER, cx: 8, cy: 8, r: 9, flat: 3 });
const glyph = (ramp, tone) => [
    { inside: ellipse(8, 4.6, 1.8, 1.8), ramp, cx: 8, cy: 4.6, r: 2, flat: tone },
    { inside: line(8, 7, 8, 12.8, 1.1), ramp, cx: 8, cy: 10, r: 3, flat: tone },
    { inside: line(6.2, 8.6, 9.8, 8.6, 1.0), ramp, cx: 8, cy: 8.6, r: 2, flat: tone },
    { inside: line(6.6, 11.4, 9.4, 11.4, 1.0), ramp, cx: 8, cy: 11.4, r: 2, flat: tone }
];
// 불씨의 흉터: 숯덩이(body)에 불씨 금(glow). 잠든 흉터는 잿빛에 금도 식었다.
const SCAR_RAMPS = {
    ember: { body: ['#120c0a', '#2a1c16', '#43302a', '#5c463c', '#7a6052'], glow: ['#3a0e04', '#8a2408', '#e0561a', '#ffa040', '#ffe0a0'] },
    ash: { body: ['#18181a', '#38383c', '#58585e', '#7a7a82', '#a4a4ac'], glow: ['#1e1612', '#3e2c24', '#5c463a', '#7a6050', '#987c6a'] }
};
const SCAR_SHAPES = {
    scar: ramps => [
        { inside: polygon([[4, 4], [9, 2.5], [12.8, 5], [13.5, 9.5], [11, 13.5], [6, 13.8], [2.8, 10.5], [3, 6.5]]), ramp: ramps.body, cx: 8, cy: 8, r: 6.5 },
        { inside: line(5.2, 5.6, 8.4, 8.8, 1.1), ramp: ramps.glow, cx: 7, cy: 7, r: 3, flat: 3 },
        { inside: line(8.4, 8.8, 11.6, 6.8, 1.1), ramp: ramps.glow, cx: 10, cy: 8, r: 3, flat: 3 },
        { inside: line(8.4, 8.8, 7.4, 12.4, 1.1), ramp: ramps.glow, cx: 8, cy: 10.6, r: 3, flat: 2 },
        { inside: ellipse(8.4, 8.8, 1.3, 1.3), ramp: ramps.glow, cx: 8.4, cy: 8.8, r: 1.3, flat: 4 }
    ]
};
const TALISMAN_SHAPES = {
    talisman: ramp => [paper(), ...glyph(ramp, 3)],
    sealed: ramp => [{ ...paper(), flat: 2 }, ...glyph(ramp, 1),
        { inside: line(3.6, 8.2, 12.4, 8.2, 1.6), ramp: BARK, cx: 8, cy: 8, r: 5, flat: 2 },
        { inside: ellipse(8, 8.2, 1.4, 1.3), ramp: BARK, cx: 8, cy: 8, r: 2, flat: 3 }]
};

/** Tone for a pixel inside a part: brighter towards the upper left, darker to the lower right. */
function tone(part, x, y) {
    if (part.flat !== undefined) return part.flat;
    const light = -((x - part.cx) * 0.6 + (y - part.cy) * 0.8) / part.r;
    if (part.facets) return facetTone(part, x, y);
    return light > 0.55 ? 4 : light > 0.15 ? 3 : light > -0.35 ? 2 : 1;
}
/** Amber: three faces (top lit, left mid, right dark) and a bright ridge. */
function facetTone(part, x, y) {
    if (Math.abs(x - 8) < 0.6 && y > 8) return 2;
    if (y < 8 - Math.abs(x - 8) * 0.6) return x < 8 ? 4 : 3;
    return x < 8 ? 3 : 1;
}

function paint(shape, ramp) {
    const rgb = new Int32Array(SIZE * SIZE), alpha = new Uint8Array(SIZE * SIZE), owner = new Array(SIZE * SIZE).fill(null);
    for (const part of (SHAPES[shape] || TALISMAN_SHAPES[shape] || SCAR_SHAPES[shape])(ramp)) {
        for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
            if (!part.inside(x + 0.5, y + 0.5)) continue;
            const i = y * SIZE + x;
            rgb[i] = hex(part.ramp[tone(part, x + 0.5, y + 0.5)]); alpha[i] = 1; owner[i] = part;
        }
        if (part.vein) veinLine(rgb, part);
        if (part.glint) glint(rgb, part);
    }
    outline(rgb, alpha, owner);
    return { rgb, alpha };
}
function veinLine(rgb, part) {
    const [[x0, y0], [x1, y1]] = part.vein, steps = 12;
    for (let s = 0; s <= steps; s++) {
        const x = Math.round(x0 + (x1 - x0) * s / steps), y = Math.round(y0 + (y1 - y0) * s / steps), i = y * SIZE + x;
        if (part.inside(x + 0.5, y + 0.5)) rgb[i] = hex(part.ramp[1]);
    }
}
function glint(rgb, part) {
    for (const [x, y] of [[6, 7], [6, 8], [7, 6]]) if (part.inside(x + 0.5, y + 0.5)) rgb[y * SIZE + x] = hex(part.ramp[4]);
}
/** One dot of the owning part's darkest tone around everything painted. */
function outline(rgb, alpha, owner) {
    const edge = [];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        if (alpha[y * SIZE + x]) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, j = ny * SIZE + nx;
            if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE || !alpha[j]) continue;
            edge.push([y * SIZE + x, hex(owner[j].ramp[0])]);
            break;
        }
    }
    for (const [i, color] of edge) { rgb[i] = color; alpha[i] = 1; }
}

function main() {
    const out = path.resolve(__dirname, '..', 'assets/px/stump');
    fs.mkdirSync(out, { recursive: true });
    let count = 0;
    for (const [shapes, ramps] of [[SHAPES, COLORS], [TALISMAN_SHAPES, RARITIES], [SCAR_SHAPES, SCAR_RAMPS]]) {
        for (const shape of Object.keys(shapes)) {
            for (const [color, ramp] of Object.entries(ramps)) {
                const { rgb, alpha } = paint(shape, ramp);
                fs.writeFileSync(path.join(out, `${shape}-${color}.png`), encodePng(rgb, SIZE, SIZE, alpha));
                count++;
            }
        }
    }
    console.log(`그루터기 함 아이콘 ${count}장 → assets/px/stump/`);
}

if (require.main === module) main();
module.exports = { SHAPES, COLORS, TALISMAN_SHAPES, RARITIES, SCAR_SHAPES, SCAR_RAMPS, paint };
