#!/usr/bin/env node
/* 옆에서 보는 무대의 몬스터 시트를 그린다(docs/stage-view-20261011.md). 오른쪽을 보는 가로 한 줄, 캐릭터와 같은 밀도.
 *
 *   node scripts/build-stage-monsters.cjs              # 미리보기만: artifacts/stage-monsters/preview.png
 *   node scripts/build-stage-monsters.cjs --write      # assets/enemies/stage/<id>-idle.png, <id>-attack.png 교체
 *   node scripts/build-stage-monsters.cjs act1-ant     # 한 마리만
 *   node scripts/build-stage-monsters.cjs --samples    # 2D로 그린 견본(scripts/stage-monsters/cave.cjs, cel.cjs): 미리보기와
 *                                                      # 시트를 artifacts/stage-monsters/samples 에만 쓴다(게임에 물리지 않았다)
 *
 * 몬스터 정의는 scripts/stage-monsters/<묶음>.cjs(입체 몇 개 + 자세), 입체를 쏘는 법은 scripts/stage-monsters/render.cjs,
 * 칠하는 법은 scripts/stage-monsters/paint.cjs(무대 조각 묶음의 화풍에 맞춘 빛과 색).
 * 게임 쪽 규격(발 자리, 높이, 프레임 시간)은 data/monster-sprites.js MONSTER_STAGE_SHEETS, MONSTER_STAGE_KIND.
 * 미리보기에는 무대 주인공 한 장을 옆에 세워 크기를 견준다(그림 폴더 assets/playable/stage가 있을 때만).
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const R = require('./stage-monsters/render.cjs');
const P = require('./stage-monsters/paint.cjs');
const { decodePng, encodePng } = require('./lib/png.cjs');

const root = path.resolve(__dirname, '..');
const SETS = ['act1', 'wisps'];
const PREVIEW_SCALE = 3, HERO_CELL = 128, HERO_FEET = 110;
const HERO_SHEET = path.join(root, 'assets/playable/stage/warrior/swordshield/idle.png');

function frames(monster, state, count) {
    // drawn: 2D로 바로 그리는 몬스터(cel.cjs)는 build가 칸 그림을 돌려준다. 나머지는 입체를 쏘아 칠한다.
    return Array.from({ length: count }, (_, f) => (monster.drawn ? monster.build({ state, f }) : P.paint(monster.build({ state, f }), monster.mats, monster.size, monster.feet)));
}
/** How far the picture rises above the feet in the first idle frame, in dots: the height the game needs for the life bar. */
function heightOf(monster, frame) {
    for (let y = 0; y < monster.size; y++) for (let x = 0; x < monster.size; x++) if (frame[(y * monster.size + x) * 4 + 3]) return monster.feet[1] - y;
    return 0;
}
/** Copies the opaque dots of a source rect onto the preview at an integer scale. */
function blit(target, from, at) {
    const scale = PREVIEW_SCALE;
    for (let y = 0; y < from.h * scale; y++) for (let x = 0; x < from.w * scale; x++) {
        const src = ((from.y + Math.floor(y / scale)) * from.sheet.width + from.x + Math.floor(x / scale)) * 4;
        if (from.sheet.data[src + 3] < 128) continue;
        target.data.set(from.sheet.data.subarray(src, src + 3), ((at.y + y) * target.width + at.x + x) * 4);
    }
}
function preview(rows) {
    const cell = rows[0].monster.size, columns = Math.max(...rows.map(row => row.list.length));
    const target = { width: (columns * cell + HERO_CELL) * PREVIEW_SCALE, height: rows.length * HERO_CELL * PREVIEW_SCALE, data: null };
    target.data = new Uint8Array(target.width * target.height * 4);
    for (let i = 0; i < target.width * target.height; i++) target.data.set([52, 44, 50, 255], i * 4);
    const hero = fs.existsSync(HERO_SHEET) ? decodePng(fs.readFileSync(HERO_SHEET)) : null;
    rows.forEach((row, r) => {
        const top = r * HERO_CELL * PREVIEW_SCALE;
        if (hero) blit(target, { sheet: hero, x: 0, y: 0, w: HERO_CELL, h: HERO_CELL }, { x: 0, y: top });
        row.list.forEach((frame, f) => blit(target, { sheet: { width: cell, data: frame }, x: 0, y: 0, w: cell, h: cell },
            { x: (HERO_CELL + f * cell) * PREVIEW_SCALE, y: top + (HERO_FEET - row.monster.feet[1]) * PREVIEW_SCALE }));
    });
    return encodePng(target.width, target.height, target.data);
}

function main() {
    const samples = process.argv.includes('--samples'), write = samples || process.argv.includes('--write');
    const only = process.argv.slice(2).find(arg => !arg.startsWith('--')) || '';
    const outDir = path.join(root, samples ? 'artifacts/stage-monsters/samples' : 'assets/enemies/stage'), rows = [];
    for (const set of samples ? ['cave'] : SETS) {
        const { monsters, IDLE_FRAMES, ATTACK_FRAMES } = require(`./stage-monsters/${set}.cjs`);
        for (const monster of monsters) {
            if (only && monster.id !== only) continue;
            const idle = frames(monster, 'idle', IDLE_FRAMES), attack = frames(monster, 'attack', ATTACK_FRAMES);
            rows.push({ monster, list: idle.concat(attack) });
            console.log(`  ${monster.id}: 높이 ${heightOf(monster, idle[0])}`);
            if (!write) continue;
            fs.mkdirSync(outDir, { recursive: true });
            for (const [name, list] of [['idle', idle], ['attack', attack]]) {
                const sheet = R.strip(list, monster.size);
                fs.writeFileSync(path.join(outDir, `${monster.id}-${name}.png`), encodePng(sheet.width, sheet.height, sheet.data));
            }
        }
    }
    if (!rows.length) { console.error('그릴 몬스터가 없습니다.'); process.exit(1); }
    const previewDir = path.join(root, 'artifacts/stage-monsters');
    fs.mkdirSync(previewDir, { recursive: true });
    const previewFile = samples ? 'samples-preview.png' : 'preview.png';
    fs.writeFileSync(path.join(previewDir, previewFile), preview(rows));
    console.log(`${rows.length}마리${write ? ', ' + path.relative(root, outDir).replace(/\\/g, '/') + '에 썼습니다' : ''}. 미리보기: artifacts/stage-monsters/${previewFile}`);
}

main();
