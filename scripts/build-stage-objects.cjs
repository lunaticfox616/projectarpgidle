#!/usr/bin/env node
/* 옆에서 보는 무대의 탐험 물체 그림을 그린다(docs/stage-view-20261011.md). 물체 하나가 칸 하나, 가로 한 줄.
 *
 *   node scripts/build-stage-objects.cjs            # 미리보기만: artifacts/stage-monsters/objects-preview.png
 *   node scripts/build-stage-objects.cjs --write    # assets/objects/stage/objects.png 교체
 *
 * 물체 정의는 scripts/stage-monsters/objects.cjs, 그리는 법은 scripts/stage-monsters/render.cjs(몬스터와 같다).
 * 게임 쪽 규격(칸 크기, 발 자리, 이름 순서)은 data/stage-view.js STAGE_OBJECTS: 여기 순서와 같아야 한다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const R = require('./stage-monsters/render.cjs');
const { encodePng } = require('./lib/png.cjs');
const { objects, SIZE, FEET } = require('./stage-monsters/objects.cjs');

const root = path.resolve(__dirname, '..');
const PREVIEW_SCALE = 3, PREVIEW_COLUMNS = 5;

/** The cells on a dark floor colour at an integer scale, a few to a row. */
function preview(cells) {
    const rows = Math.ceil(cells.length / PREVIEW_COLUMNS), cell = SIZE * PREVIEW_SCALE;
    const width = PREVIEW_COLUMNS * cell, height = rows * cell, data = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i++) data.set([77, 64, 53, 255], i * 4);
    cells.forEach((frame, index) => {
        const left = (index % PREVIEW_COLUMNS) * cell, top = Math.floor(index / PREVIEW_COLUMNS) * cell;
        for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
            const src = (Math.floor(y / PREVIEW_SCALE) * SIZE + Math.floor(x / PREVIEW_SCALE)) * 4;
            if (frame[src + 3] >= 128) data.set(frame.subarray(src, src + 3), ((top + y) * width + left + x) * 4);
        }
    });
    return encodePng(width, height, data);
}

function main() {
    const cells = objects.map(object => R.render(object.build(), object.mats, SIZE, FEET));
    const previewDir = path.join(root, 'artifacts/stage-monsters');
    fs.mkdirSync(previewDir, { recursive: true });
    fs.writeFileSync(path.join(previewDir, 'objects-preview.png'), preview(cells));
    if (process.argv.includes('--write')) {
        const sheet = R.strip(cells, SIZE), outDir = path.join(root, 'assets/objects/stage');
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, 'objects.png'), encodePng(sheet.width, sheet.height, sheet.data));
    }
    console.log(`${objects.length}개: ${objects.map(object => object.name).join(', ')}. 미리보기: artifacts/stage-monsters/objects-preview.png`);
}

main();
