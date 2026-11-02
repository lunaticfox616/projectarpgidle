#!/usr/bin/env node
/* 이야기 NPC 다섯(하켄, 베른, 오르가, 이벨, 베일라)의 대기 도트를 게임이 읽는 자리로 옮긴다(data/stage-view.js STAGE_NPC_ART,
 * docs/stage-view-20261011.md).
 *
 *   node scripts/build-stage-npcs.cjs <대기 시트 폴더> [복사해 둘 폴더]
 *
 * <대기 시트 폴더>/<id>-idle.png: 그림 도구가 마친 시트(칸 160×160 6장 한 줄, 발 (80,144), 알파 0과 255). 2026-10-21 새 주인공 비율로
 *   다시 그린 판(artifacts/npc-idle-revision-20261021/sprites)부터 이 모양이고, 모양이 다르면 멈춘다.
 * 옮기며 두 가지를 고친다(2026-11-02 사용자: 첫 장은 화풍과 크기가 달라 빼고, 흐릿함을 없애 달라):
 *   - 첫 장을 뺀다. 첫 장은 정지 그림이고 동작 다섯 장과 몸 넓이가 다르다. 게임의 시트는 다섯 장이다.
 *   - 거의 같은 색을 합친다(NEAR_COLOUR). 옅게 다른 색이 이웃해 있어 1.5배로 그리면 번져 보였다(이웃 칸 밝기 차 12 미만이 19~35%, 주인공 5~15%).
 *     시트 전체에 한 색표를 쓰므로 프레임마다 깜박이지 않고, 새 색은 만들지 않는다. 화소의 자리는 그대로다.
 * 초상화는 scripts/build-portraits.cjs가 만든다.
 * 쓰는 곳: assets/stage-npcs/<id>-idle.png. [복사해 둘 폴더](런처의 rignin-ui\stage-npcs)에도 똑같이 둔다.
 * 원본은 읽기만 한다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { decodePng, encodePng } = require('./lib/png.cjs');

const root = path.join(__dirname, '..');
const IDS = ['haken', 'bern', 'orga', 'ivel', 'veila'];
const SHEET = Object.freeze({ cell: 160, frames: 6, feetY: 144 });
// 이 거리보다 가까운 두 색은 많이 쓰인 쪽으로 합친다(거리: √(2r² + 4g² + 3b²)). 40부터는 이벨의 갈색 머리가 붉어졌다.
const NEAR_COLOUR = 30;

/** Stops unless the sheet is SHEET.frames cells of SHEET.cell in one row, alpha 0 or 255, every frame's lowest dots on the feet line. */
function checkSheet(id, png) {
    const { cell, frames, feetY } = SHEET;
    if (png.width !== cell * frames || png.height !== cell) throw new Error(`${id}: ${cell * frames}×${cell} 시트가 아니다(${png.width}×${png.height})`);
    for (let f = 0; f < frames; f++) {
        let bottom = -1;
        for (let y = 0; y < cell; y++) {
            for (let x = 0; x < cell; x++) {
                const a = png.data[(y * png.width + f * cell + x) * 4 + 3];
                if (a !== 0 && a !== 255) throw new Error(`${id}: ${f + 1}번째 장에 반투명 픽셀`);
                if (a) bottom = y;
            }
        }
        if (bottom !== feetY - 1) throw new Error(`${id}: ${f + 1}번째 장의 발끝이 ${feetY - 1}번 줄이 아니다(${bottom})`);
    }
}
const colourKey = (data, i) => (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
function colourDistance(a, b) {
    const dr = (a >> 16) - (b >> 16), dg = ((a >> 8) & 255) - ((b >> 8) & 255), db = (a & 255) - (b & 255);
    return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}
/** The closest two colours still under NEAR_COLOUR, or null. */
function closestColours(colours) {
    let best = null;
    for (let a = 0; a < colours.length; a++) {
        for (let b = a + 1; b < colours.length; b++) {
            const distance = colourDistance(colours[a], colours[b]);
            if (distance < NEAR_COLOUR && (!best || distance < best.distance)) best = { distance, a: colours[a], b: colours[b] };
        }
    }
    return best;
}
/** Colour → the colour it merges into, closest pairs first, the more used of the two staying. */
function nearColourMap(data) {
    const counts = new Map();
    for (let i = 0; i < data.length; i += 4) if (data[i + 3]) counts.set(colourKey(data, i), (counts.get(colourKey(data, i)) || 0) + 1);
    const into = new Map();
    for (let pair = closestColours([...counts.keys()]); pair; pair = closestColours([...counts.keys()])) {
        const [keep, drop] = counts.get(pair.a) >= counts.get(pair.b) ? [pair.a, pair.b] : [pair.b, pair.a];
        counts.set(keep, counts.get(keep) + counts.get(drop));
        counts.delete(drop);
        into.set(drop, keep);
    }
    return into;
}
/** The sheet the game reads: without the first frame, near colours merged. */
function gameSheet(png) {
    const { cell, frames } = SHEET, width = cell * (frames - 1), data = Buffer.alloc(width * cell * 4);
    for (let y = 0; y < cell; y++) Buffer.from(png.data).copy(data, y * width * 4, (y * png.width + cell) * 4, (y * png.width + png.width) * 4);
    const into = nearColourMap(data);
    for (let i = 0; i < data.length; i += 4) {
        let colour = data[i + 3] ? colourKey(data, i) : null;
        if (colour === null || !into.has(colour)) continue;
        while (into.has(colour)) colour = into.get(colour);
        data[i] = colour >> 16; data[i + 1] = (colour >> 8) & 255; data[i + 2] = colour & 255;
    }
    return encodePng(width, cell, data);
}
function main(args) {
    const [source, copy] = args;
    if (!source) {
        console.log('node scripts/build-stage-npcs.cjs <대기 시트 폴더> [복사해 둘 폴더]');
        return 2;
    }
    const target = path.join(root, 'assets/stage-npcs');
    fs.mkdirSync(target, { recursive: true });
    for (const id of IDS) {
        const png = decodePng(fs.readFileSync(path.join(source, `${id}-idle.png`)));
        checkSheet(id, png);
        fs.writeFileSync(path.join(target, `${id}-idle.png`), gameSheet(png));
        console.log(`${id}: 대기 시트를 옮겼다`);
    }
    if (copy) {
        fs.mkdirSync(copy, { recursive: true });
        for (const file of fs.readdirSync(target)) fs.copyFileSync(path.join(target, file), path.join(copy, file));
        console.log(`복사: ${copy}`);
    }
    return 0;
}
try {
    process.exitCode = main(process.argv.slice(2));
} catch (error) {
    console.error(`멈춤: ${error.message}`);
    process.exitCode = 1;
}
