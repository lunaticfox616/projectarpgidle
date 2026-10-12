#!/usr/bin/env node
/* 무대 몬스터의 새 그림(걷기와 공격)을 게임이 읽는 모양으로 옮긴다(docs/stage-view-20261011.md).
 *
 *   node scripts/build-stage-roster.cjs <정리한 그림 폴더> [복사해 둘 폴더]
 *
 * <정리한 그림 폴더>는 몬스터 그림을 받아 정리해 둔 곳이다(data.js와 fixed/<id>/walk.png과 attack.png, 그 위 폴더의 motions.json).
 * 받은 그림은 칸이 몸보다 훨씬 커서(가장 큰 칸 832도트에 몸 437×223) 그대로 풀면 메모리가 크다: 몬스터마다 걷기와 공격의 모든
 * 프레임이 들어가는 가장 작은 칸으로 잘라 가로 한 줄로 다시 놓는다. 걷기와 공격은 같은 칸, 같은 발 자리를 쓴다.
 *   그림: assets/enemies/roster/<id>-walk.png과 <id>-attack.png (저장소에 넣지 않는다, .gitignore). [복사해 둘 폴더]에도 똑같이 둔다.
 *   표: data/monster-stage-roster.js (칸 크기, 발 자리, 몸 높이와 너비, 걸음새, 프레임 시간, 타격 프레임).
 * 원본은 읽기만 한다. RGBA 8비트 PNG만 읽는다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { decodePng, encodePng } = require('./lib/png.cjs');

const root = path.join(__dirname, '..');
const [from, mirror] = process.argv.slice(2);
if (!from) { console.error('쓰는 법: node scripts/build-stage-roster.cjs <정리한 그림 폴더> [복사해 둘 폴더]'); process.exit(1); }
const PAD = 2;
/** 걸음새: 걷는 그림을 고르는 방식과, 그림 없이 걷는 척할 때의 움직임을 정한다(js/canvas-stage-roster.js). */
const GAIT_BY_TRAVEL = { 비행: 'fly', 부유: 'float', 유영: 'swim', 구르기: 'roll', 기어가기: 'crawl' };
/** 스토리 보스의 그림 키(enemy.bossAssetKey) → 이 표의 id. 새 모습으로 다시 그린 보스는 id가 그림 키와 다르다. */
const BOSS_BY_ASSET = { bossAct1: 'bossAct1', bossAct3: 'famine_beast' };

function gaitOf(entry) {
    if (/slime/.test(entry.id)) return 'hop';
    if (/worm/.test(entry.id)) return 'crawl';
    return GAIT_BY_TRAVEL[entry.travelLabel] || 'legs';
}
/** 한 장의 프레임마다 차 있는 도트의 상자. */
function boxes(png, size) {
    const list = [];
    for (let f = 0; f * size < png.width; f++) {
        let left = size, right = -1, top = size, bottom = -1;
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            if (png.data[(y * png.width + f * size + x) * 4 + 3] < 128) continue;
            if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y;
        }
        list.push({ left, right, top, bottom });
    }
    return list;
}
/** 프레임을 같은 상자로 잘라 가로 한 줄로 놓은 그림. */
function cropped(png, size, box) {
    const w = box.right - box.left + 1, h = box.bottom - box.top + 1, frames = Math.floor(png.width / size), data = new Uint8Array(w * frames * h * 4);
    for (let f = 0; f < frames; f++) for (let y = 0; y < h; y++) {
        const at = ((box.top + y) * png.width + f * size + box.left) * 4;
        data.set(png.data.subarray(at, at + w * 4), (y * w * frames + f * w) * 4);
    }
    return encodePng(w * frames, h, data);
}
const middle = list => list.slice().sort((a, b) => a - b)[Math.floor(list.length / 2)];

const window = {};
// eslint-disable-next-line no-eval -- 정리 폴더의 목록은 window.ROSTER = {...}; 한 줄짜리 자료 파일이다
eval(fs.readFileSync(path.join(from, 'data.js'), 'utf8'));
const motions = new Map(JSON.parse(fs.readFileSync(path.join(from, '..', 'motions.json'), 'utf8')).entries.map(entry => [entry.id, entry]));
const outDir = path.join(root, 'assets/enemies/roster');
fs.mkdirSync(outDir, { recursive: true });
if (mirror) fs.mkdirSync(mirror, { recursive: true });

const rows = [];
for (const actor of window.ROSTER.actors) {
    const entry = motions.get(actor.id), size = actor.size;
    // 윗몸 움직임을 넣은 걷기가 따로 있으면 그것을 쓴다(받은 걷기는 윗몸이 굳어 있다)
    const shown = actor.versions.find(version => version.key === 'claude' && version.walk.src.startsWith('fixed/')) || actor.versions[0];
    const sheets = { walk: decodePng(fs.readFileSync(path.join(from, shown.walk.src))), attack: decodePng(fs.readFileSync(path.join(from, actor.versions[0].attack.src))) };
    const frames = { walk: boxes(sheets.walk, size), attack: boxes(sheets.attack, size) }, all = [...frames.walk, ...frames.attack];
    const box = {
        left: Math.max(0, Math.min(...all.map(b => b.left)) - PAD), right: Math.min(size - 1, Math.max(...all.map(b => b.right)) + PAD),
        top: Math.max(0, Math.min(...all.map(b => b.top)) - PAD), bottom: Math.min(size - 1, Math.max(actor.feet[1] - 1, ...all.map(b => b.bottom)) + PAD)
    };
    for (const clip of ['walk', 'attack']) {
        const file = `${actor.id}-${clip}.png`, png = cropped(sheets[clip], size, box);
        fs.writeFileSync(path.join(outDir, file), png);
        if (mirror) fs.writeFileSync(path.join(mirror, file), png);
    }
    const ready = frames.attack[0], width = middle(frames.walk.map(b => b.right - b.left + 1)), attackMs = actor.versions[0].attack.ms;
    let impact = attackMs.length - 1, passed = 0;
    for (let f = 0; f < attackMs.length; f++) { if (passed >= (entry.impactStartMs || 0)) { impact = f; break; } passed += attackMs[f]; }
    rows.push([
        actor.id, actor.name, box.right - box.left + 1, box.bottom - box.top + 1, actor.feet[0] - box.left, actor.feet[1] - box.top,
        actor.feet[1] - Math.min(ready.top, ...frames.walk.map(b => b.top)), width, gaitOf(entry), shown.walk.ms, attackMs, impact
    ]);
}

const quote = text => `'${String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const line = row => `        [${row.map(cell => (Array.isArray(cell) ? `[${cell.join(', ')}]` : typeof cell === 'string' ? quote(cell) : cell)).join(', ')}]`;
const text = `// 옆에서 보는 무대의 몬스터 새 그림(docs/stage-view-20261011.md): node scripts/build-stage-roster.cjs가 쓴다. 손으로 고치지 않는다.
// 몬스터마다 걷기와 공격 두 장(오른쪽을 보는 가로 한 줄, 도트 하나 = 캐릭터 도트 하나)이고, 두 장은 칸 크기와 발 자리가 같다.
// 그림은 저장소에 없다(assets/enemies/roster/, 로컬에만 둔다). 없는 곳에서는 앞서 쓰던 그림으로 그린다(js/canvas-stage-roster.js).
// 걸음새(gait): legs 다리로 걷는다, hop 통통 뛴다, crawl 기어간다, roll 굴러간다, fly, float, swim 떠서 움직인다.
// stride: 걷기 한 바퀴에 나아가는 거리(도트) = 몸 너비의 0.7배. impactFrame: 공격 그림에서 때리는 프레임.
const MONSTER_STAGE_ROSTER = Object.freeze({
    path: 'assets/enemies/roster/',
    /** 스토리 보스의 그림 키(enemy.bossAssetKey) → 아래 표의 id. */
    bossByAsset: Object.freeze(${JSON.stringify(BOSS_BY_ASSET).replace(/"/g, "'").replace(/'(\w+)':/g, '$1: ').replace(/,/g, ', ').replace(/^\{/, '{ ').replace(/\}$/, ' }')}),
    // [id, 이름, 칸 가로, 칸 세로, 발 x, 발 y, 몸 높이, 몸 너비, 걸음새, 걷기 프레임 시간(ms), 공격 프레임 시간(ms), 타격 프레임]
    actors: Object.freeze(Object.fromEntries([
${rows.map(line).join(',\n')}
    ].map(([id, name, w, h, feetX, feetY, height, width, gait, walkMs, attackMs, impactFrame]) => [id, Object.freeze({
        id, name, w, h, feet: Object.freeze([feetX, feetY]), height, width, gait, stride: Math.max(24, Math.round(width * 0.7)),
        walkMs: Object.freeze(walkMs), attackMs: Object.freeze(attackMs), impactFrame
    })])))
});

safeExposeData({ MONSTER_STAGE_ROSTER });
`;
fs.writeFileSync(path.join(root, 'data/monster-stage-roster.js'), text);
const bytes = fs.readdirSync(outDir).reduce((sum, name) => sum + fs.statSync(path.join(outDir, name)).size, 0);
console.log(`몬스터 ${rows.length}마리, 그림 ${rows.length * 2}장 (${(bytes / 1048576).toFixed(1)}MB) → assets/enemies/roster/${mirror ? ' 와 ' + mirror : ''}`);
console.log('가장 큰 칸:', rows.slice().sort((a, b) => b[2] * b[3] - a[2] * a[3]).slice(0, 3).map(row => `${row[0]} ${row[2]}x${row[3]}`).join(', '));
