#!/usr/bin/env node
/* NPC 다섯과 여섯 직업의 초상화를 게임 크기로 줄인다(2026-10-31 사용자: 용량과 그림을 검수한 뒤 적용).
 *
 *   node scripts/build-portraits.cjs <NPC 일러스트 폴더> <직업 일러스트 폴더>
 *
 * 입력은 그림 도구가 낸 1024×1536 투명 PNG(장당 1.5MB 안팎)이고, 출력은 480×720 WebP(장당 40~75KB)다. 첫 판의 원본은
 * artifacts/npc-graphic-style-20261030, artifacts/player-class-portraits-20261031(저장소에 넣지 않음). 판을 바꾸면 아래 표의 이름을 고친다.
 * 쓰는 곳: assets/stage-npcs/<id>-portrait.webp, assets/portraits/classes/<id>.webp. 원본은 읽기만 한다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const root = path.join(__dirname, '..');
const SIZE = Object.freeze({ width: 480, height: 720, quality: 0.9 });
const NPC_FILES = Object.freeze({ haken: 'haken-graphic-v2', bern: 'bern-graphic-v1', orga: 'orga-graphic-v1', ivel: 'ivel-graphic-v1', veila: 'veila-graphic-v1' });
const CLASS_FILES = Object.freeze({ warrior: 'warrior-portrait-v4', wanderer: 'wanderer-portrait-v2', archer: 'archer-portrait-v4',
    occultist: 'occultist-portrait-v4', cleric: 'cleric-portrait-v5', alchemist: 'alchemist-portrait-v3' });

/** The picture drawn smaller on a canvas and written out by the browser's WebP encoder (Node has none). */
async function shrink(page, sourceFile) {
    const url = `data:image/png;base64,${fs.readFileSync(sourceFile).toString('base64')}`;
    const encoded = await page.evaluate(async ({ url, width, height, quality }) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, width, height);
        return canvas.toDataURL('image/webp', quality).split(',')[1];
    }, { url, ...SIZE });
    return Buffer.from(encoded, 'base64');
}

async function main([npcFolder, classFolder]) {
    if (!npcFolder || !classFolder) {
        console.log('node scripts/build-portraits.cjs <NPC 일러스트 폴더> <직업 일러스트 폴더>');
        return 2;
    }
    const jobs = [
        ...Object.entries(NPC_FILES).map(([id, name]) => [path.join(npcFolder, `${name}.png`), path.join(root, 'assets/stage-npcs', `${id}-portrait.webp`)]),
        ...Object.entries(CLASS_FILES).map(([id, name]) => [path.join(classFolder, `${name}.png`), path.join(root, 'assets/portraits/classes', `${id}.webp`)])
    ];
    const browser = await chromium.launch();
    const page = await browser.newPage();
    for (const [source, target] of jobs) {
        const output = await shrink(page, source);
        fs.writeFileSync(target, output);
        console.log(`${path.relative(root, target)}: ${Math.round(fs.statSync(source).size / 1024)}KB -> ${Math.round(output.length / 1024)}KB`);
    }
    await browser.close();
    return 0;
}

main(process.argv.slice(2)).then(code => { process.exitCode = code; }, error => {
    console.error(`멈춤: ${error.message}`);
    process.exitCode = 1;
});
