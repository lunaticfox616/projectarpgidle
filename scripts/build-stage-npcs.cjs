#!/usr/bin/env node
/* 이야기 NPC 다섯(하켄, 베른, 오르가, 이벨, 베일라)의 대기 도트를 게임이 읽는 자리로 옮긴다(data/stage-view.js STAGE_NPC_ART,
 * docs/stage-view-20261011.md).
 *
 *   node scripts/build-stage-npcs.cjs <대기 시트 폴더> [복사해 둘 폴더]
 *
 * <대기 시트 폴더>/<id>-idle.png: 그림 도구가 마친 시트(칸 160×160 6장 한 줄, 발 (80,144), 알파 0과 255). 2026-10-21 새 주인공 비율로
 *   다시 그린 판(artifacts/npc-idle-revision-20261021/sprites)부터 이 모양이고, 모양이 다르면 멈춘다. 색과 화소는 그대로 옮긴다
 *   (그 전 128칸 내보내기에 일러스트 색을 입히던 단계는 새 그림이 승인된 색으로 와서 뺐다).
 * 초상화는 scripts/build-portraits.cjs가 만든다.
 * 쓰는 곳: assets/stage-npcs/<id>-idle.png. [복사해 둘 폴더](런처의 rignin-ui\stage-npcs)에도 똑같이 둔다.
 * 원본은 읽기만 한다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { decodePng } = require('./lib/png.cjs');

const root = path.join(__dirname, '..');
const IDS = ['haken', 'bern', 'orga', 'ivel', 'veila'];
const SHEET = Object.freeze({ cell: 160, frames: 6, feetY: 144 });

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
function main(args) {
    const [source, copy] = args;
    if (!source) {
        console.log('node scripts/build-stage-npcs.cjs <대기 시트 폴더> [복사해 둘 폴더]');
        return 2;
    }
    const target = path.join(root, 'assets/stage-npcs');
    fs.mkdirSync(target, { recursive: true });
    for (const id of IDS) {
        const sheet = path.join(source, `${id}-idle.png`);
        checkSheet(id, decodePng(fs.readFileSync(sheet)));
        fs.copyFileSync(sheet, path.join(target, `${id}-idle.png`));
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
