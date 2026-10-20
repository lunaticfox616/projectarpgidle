#!/usr/bin/env node
/* 이야기 NPC 다섯(하켄, 베른, 오르가, 이벨, 베일라)의 대기 도트를 게임이 읽는 자리로 옮긴다(data/stage-view.js STAGE_NPC_ART,
 * docs/stage-view-20261011.md).
 *
 *   node scripts/build-stage-npcs.cjs <대기 시트 폴더> [복사해 둘 폴더] [--portraits <일러스트 폴더>]
 *
 * <대기 시트 폴더>/<id>-idle.png: 그림 도구가 마친 시트(칸 160×160 6장 한 줄, 발 (80,144), 알파 0과 255). 2026-10-21 새 주인공 비율로
 *   다시 그린 판(artifacts/npc-idle-revision-20261021/sprites)부터 이 모양이고, 모양이 다르면 멈춘다. 색과 화소는 그대로 옮긴다
 *   (그 전 128칸 내보내기에 일러스트 색을 입히던 단계는 새 그림이 승인된 색으로 와서 뺐다).
 * --portraits: <일러스트 폴더>/<id>-selective-v4.png(1024×1536 투명 일러스트)를 480×720 초상화로 줄인다. 없으면 초상화는 그대로 둔다.
 * 쓰는 곳: assets/stage-npcs/<id>-idle.png, <id>-portrait.png. [복사해 둘 폴더](런처의 rignin-ui\stage-npcs)에도 똑같이 둔다.
 * 원본은 읽기만 한다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { decodePng, encodePng } = require('./lib/png.cjs');

const root = path.join(__dirname, '..');
const IDS = ['haken', 'bern', 'orga', 'ivel', 'veila'];
const SHEET = Object.freeze({ cell: 160, frames: 6, feetY: 144 });
const PORTRAIT = Object.freeze({ width: 480, height: 720 });

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
/** The illustration shrunk by area averaging (alpha-weighted colour). */
function portraitOf(png) {
    const { width, height } = PORTRAIT, out = Buffer.alloc(width * height * 4), sx = png.width / width, sy = png.height / height;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0, n = 0;
            for (let yy = Math.floor(y * sy); yy < Math.floor((y + 1) * sy); yy++) {
                for (let xx = Math.floor(x * sx); xx < Math.floor((x + 1) * sx); xx++) {
                    const i = (yy * png.width + xx) * 4, w = png.data[i + 3];
                    r += png.data[i] * w; g += png.data[i + 1] * w; b += png.data[i + 2] * w; a += w; n++;
                }
            }
            const o = (y * width + x) * 4;
            if (a) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
            out[o + 3] = Math.round(a / n);
        }
    }
    return encodePng(width, height, out);
}

function main(args) {
    const at = args.indexOf('--portraits'), portraits = at >= 0 ? args[at + 1] : null;
    const [source, copy] = args.filter((_, i) => at < 0 || (i !== at && i !== at + 1));
    if (!source || (at >= 0 && !portraits)) {
        console.log('node scripts/build-stage-npcs.cjs <대기 시트 폴더> [복사해 둘 폴더] [--portraits <일러스트 폴더>]');
        return 2;
    }
    const target = path.join(root, 'assets/stage-npcs');
    fs.mkdirSync(target, { recursive: true });
    for (const id of IDS) {
        const sheet = path.join(source, `${id}-idle.png`);
        checkSheet(id, decodePng(fs.readFileSync(sheet)));
        fs.copyFileSync(sheet, path.join(target, `${id}-idle.png`));
        if (portraits) fs.writeFileSync(path.join(target, `${id}-portrait.png`), portraitOf(decodePng(fs.readFileSync(path.join(portraits, `${id}-selective-v4.png`)))));
        console.log(`${id}: 대기 시트를 옮겼다${portraits ? ', 초상화를 다시 만들었다' : ''}`);
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
