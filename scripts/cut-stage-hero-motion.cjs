#!/usr/bin/env node
/* 사용자가 따로 준 주인공 동작 그림(격자로 늘어놓은 투명 PNG)을 무대 캐릭터 규격의 시트로 자른다(data/stage-view.js STAGE_HERO_MOTIONS).
 *
 *   node scripts/cut-stage-hero-motion.cjs <그림.png> <가로 칸 수>x<세로 칸 수> <프레임 수> <내보낼 시트.png> [--frames 0-3] [--match <기존 시트.png>]
 *
 * 규격(data/stage-characters.js): 칸 128×128 가로 한 줄, 오른쪽을 본다, 발바닥 줄 y=110, 발 가운데 x=63. 받은 그림은 칸 크기가 그림마다
 * 다르므로(168×136, 144×144 …) 0번 프레임에서 발 자리를 찾는다: 가장 아래 그려진 줄과, 아래 여섯 줄에 그려진 점들의 가로 가운데.
 * 모든 프레임을 같은 만큼 옮겨 그 자리가 (63, 110)에 오게 한다(받은 그림의 한 칸 안에서 몸이 움직인 만큼은 그대로 남는다).
 *   --frames a-b  그 가운데 a번부터 b번 프레임만 시트에 담는다(한 묶음의 연속기를 휘두름 하나씩으로 나눌 때).
 *   --match       그 시트의 0번 프레임과 받은 그림의 0번 프레임이 몇 점 다른지 적는다(같은 캐릭터, 같은 배율인지 확인).
 * 그림을 키우거나 줄이지 않는다. 칸 밖으로 나가는 점은 버리고 그 수를 적는다. 그림 파일은 저장소에 넣지 않는다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { decodePng, encodePng } = require('./lib/png.cjs');

const CELL = 128, FEET = Object.freeze([63, 110]), FOOT_ROWS = 6;

function fail(message) { console.error(message); process.exit(1); }

/** The foot point of one cell: the lowest drawn row and the mean x of the drawn pixels in the lowest FOOT_ROWS rows. */
function footOf(png, box) {
    let lowest = -1;
    for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) if (png.data[((box.y + y) * png.width + box.x + x) * 4 + 3] >= 128) lowest = y;
    if (lowest < 0) fail('0번 프레임이 비어 있습니다.');
    let sum = 0, count = 0;
    for (let y = Math.max(0, lowest - FOOT_ROWS + 1); y <= lowest; y++) {
        for (let x = 0; x < box.w; x++) if (png.data[((box.y + y) * png.width + box.x + x) * 4 + 3] >= 128) { sum += x; count++; }
    }
    return [Math.round(sum / count), lowest];
}

/** Copies cell `box` of the source into cell `slot` of the sheet, moved by `shift`. Returns how many drawn pixels fell outside. */
function place(png, box, sheet, o) {
    let lost = 0;
    for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) {
        const from = ((box.y + y) * png.width + box.x + x) * 4;
        if (!png.data[from + 3]) continue;
        const tx = x + o.shift[0], ty = y + o.shift[1];
        if (tx < 0 || ty < 0 || tx >= CELL || ty >= CELL) { lost++; continue; }
        png.data.copy(sheet, (ty * CELL * o.slots + o.slot * CELL + tx) * 4, from, from + 4);
    }
    return lost;
}

/** How many byte values differ between frame 0 of an existing sheet and frame 0 of the new one. */
function differsFrom(file, sheet, slots) {
    const old = decodePng(fs.readFileSync(file));
    let differ = 0;
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL * 4; x++) {
        if (old.data[y * old.width * 4 + x] !== sheet[y * CELL * slots * 4 + x]) differ++;
    }
    return differ;
}

function main() {
    const [input, grid, countText, output] = process.argv.slice(2);
    if (!input || !/^\d+x\d+$/.test(grid || '') || !output) fail('쓰는 법: node scripts/cut-stage-hero-motion.cjs <그림.png> <가로>x<세로> <프레임 수> <시트.png> [--frames a-b] [--match <시트.png>]');
    const args = process.argv.slice(2), option = name => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
    const png = decodePng(fs.readFileSync(input)), [cols, rows] = grid.split('x').map(Number), count = Number(countText);
    const w = png.width / cols, h = png.height / rows;
    if (!Number.isInteger(w) || !Number.isInteger(h)) fail(`그림 크기 ${png.width}×${png.height}가 ${cols}×${rows} 칸으로 나뉘지 않습니다.`);
    const boxOf = index => ({ x: (index % cols) * w, y: Math.floor(index / cols) * h, w, h });
    const foot = footOf(png, boxOf(0)), shift = [FEET[0] - foot[0], FEET[1] - foot[1]];
    const [first, last] = (option('--frames') || `0-${count - 1}`).split('-').map(Number);
    const slots = last - first + 1, sheet = Buffer.alloc(CELL * slots * CELL * 4), lost = [];
    for (let index = first; index <= last; index++) lost.push(place(png, boxOf(index), sheet, { shift, slot: index - first, slots }));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, encodePng(CELL * slots, CELL, sheet));
    console.log(`${path.basename(input)}: 칸 ${w}×${h}, 0번 프레임의 발 (${foot.join(', ')}) → (${FEET.join(', ')}), 프레임 ${first}-${last} → ${output}`);
    console.log(`  칸 밖으로 나가 버린 점: ${lost.join(', ')}`);
    if (option('--match')) console.log(`  ${option('--match')}의 0번 프레임과 다른 값: ${first === 0 ? differsFrom(option('--match'), sheet, slots) : '(0번 프레임을 담지 않아 견주지 않음)'}`);
}

main();
