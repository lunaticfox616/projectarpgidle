#!/usr/bin/env node
/* 처음 장면에서 쓰러져 있다가 일어나는 주인공 6직업의 그림(2026-10-15 사용자: "GPT가 쓰러져있는 캐릭터들의 모션도 만들었거든")을
 * 무대 주인공 시트와 같은 모양으로 옮긴다(docs/stage-view-20261011.md, 첫 시작의 쓰러진 주인공은 js/opening-journey-ui.js).
 *
 *   node scripts/build-stage-hero-rise.cjs <player-rise 폴더> [복사해 둘 폴더]
 *
 * <player-rise 폴더>: animations.json(직업마다 칸 160×128, 기준점 [79,110], 8프레임과 그 시간)과 <직업>/get-up.png(가로 8칸).
 * 받은 칸은 주인공 칸(128×128, 발 (63,110), data/stage-characters.js)의 양옆에 16점씩 덧댄 것이라, 가운데 128점만 잘라 쓴다.
 * 잘려 나가는 자리에 그림이 있으면 멈춘다. 마지막 프레임은 맨손 대기의 첫 프레임 그대로다.
 * 쓰는 곳: assets/playable/stage/<직업>/unarmed/rise.png(0번 = 쓰러진 모습). 저장소에 넣지 않는다(.gitignore의 무대 그림).
 *   [복사해 둘 폴더](런처의 rignin-ui\stage-art)에도 <직업>/unarmed/rise.png로 둔다. 프레임 시간은 data/stage-view.js STAGE_HERO_MOTIONS.
 * 원본은 읽기만 한다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { decodePng, encodePng } = require('./lib/png.cjs');

const root = path.join(__dirname, '..');
const CELL = 128;

/** One class's sheet cropped to the hero cell: the middle CELL columns of each frame, kept rows as they are. */
function cropSheet(png, anim) {
    const [width, height] = anim.cell, pad = (width - CELL) / 2;
    if (height !== CELL || pad !== anim.root[0] - 63 || anim.root[1] !== 110) throw new Error(`${anim.id}: 칸이나 기준점이 주인공 칸과 맞지 않다`);
    const out = Buffer.alloc(CELL * anim.frames * CELL * 4);
    for (let f = 0; f < anim.frames; f++) {
        for (let y = 0; y < CELL; y++) {
            for (let x = 0; x < width; x++) {
                const from = (y * png.width + f * width + x) * 4;
                const inside = x >= pad && x < pad + CELL;
                if (!inside && png.data[from + 3] > 0) throw new Error(`${anim.id} ${f + 1}번: 잘려 나갈 자리(${x},${y})에 그림이 있다`);
                if (inside) out.set(png.data.subarray(from, from + 4), (y * CELL * anim.frames + f * CELL + x - pad) * 4);
            }
        }
    }
    return encodePng(CELL * anim.frames, CELL, out);
}

function main([source, copy]) {
    if (!source) { console.log('node scripts/build-stage-hero-rise.cjs <player-rise 폴더> [복사해 둘 폴더]'); return 2; }
    const { animations } = JSON.parse(fs.readFileSync(path.join(source, 'animations.json'), 'utf8'));
    for (const anim of animations) {
        const png = cropSheet(decodePng(fs.readFileSync(path.join(source, anim.sheet))), anim);
        for (const base of [path.join(root, 'assets/playable/stage'), copy].filter(Boolean)) {
            const dir = path.join(base, anim.id, 'unarmed');
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, 'rise.png'), png);
        }
        console.log(`${anim.id}: ${anim.frames}프레임, ${anim.durations.join('/')}ms`);
    }
    return 0;
}
try {
    process.exitCode = main(process.argv.slice(2));
} catch (error) {
    console.error(`멈춤: ${error.message}`);
    process.exitCode = 1;
}
