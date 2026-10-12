#!/usr/bin/env node
/* 무대 몬스터의 새 그림(걷기와 공격)을 게임이 읽는 모양으로 옮긴다(docs/stage-view-20261011.md).
 *
 *   node scripts/build-stage-roster.cjs <정리한 그림 폴더> [복사해 둘 폴더] [--forge <새 묶음 폴더>]
 *
 * 그림이 오는 곳은 둘이다.
 *   <정리한 그림 폴더>: 처음 받은 88종을 도트로 정리해 둔 곳(data.js, fixed/<id>/walk.png과 attack.png, 그 위 폴더의 motions.json).
 *   --forge: 영상에서 뽑아 다듬은 새 묶음(sprite-forge-selected-v1). delivery-summary.json의 확인 끝난 동작(readyActors)과,
 *     production.json에서 남기기로 고른 외형(decision keep)의 한 장 그림(master.png)을 쓴다.
 * 몬스터 하나는 한쪽 묶음의 그림만 쓴다: 새 묶음에 확인 끝난 동작이 있으면 그것(공격이 없으면 공격 그림 없이 간다), 없으면
 * 처음 받은 걷기와 공격, 그것도 없고 고른 외형만 있으면 그 한 장(걷기도 공격도 게임이 움직임을 만든다).
 * 받은 그림은 칸이 몸보다 훨씬 크다: 몬스터마다 걷기와 공격의 모든 프레임이 들어가는 가장 작은 칸으로 잘라, 한 줄에 12칸씩
 * 다시 놓는다. 걷기와 공격은 같은 칸, 같은 발 자리를 쓴다.
 *   그림: assets/enemies/roster/<id>-walk.png, <id>-attack.png (저장소에 넣지 않는다, .gitignore). [복사해 둘 폴더]에도 똑같이 둔다.
 *   표: data/monster-stage-roster.js.
 * 원본은 읽기만 한다. RGBA 8비트 PNG만 읽는다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decodePng, encodePng } = require('./lib/png.cjs');
const { tidy } = require('./tidy-stage-art.cjs');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2), forgeAt = args.indexOf('--forge'), forge = forgeAt >= 0 ? args[forgeAt + 1] : null;
const [from, mirror] = args.filter((arg, index) => !arg.startsWith('--') && args[index - 1] !== '--forge');
if (!from) { console.error('쓰는 법: node scripts/build-stage-roster.cjs <정리한 그림 폴더> [복사해 둘 폴더] [--forge <새 묶음 폴더>]'); process.exit(1); }
const PAD = 2, COLUMNS = 12;
/** 걸음새: 걷는 그림을 고르는 방식과, 그림 없이 걷는 척할 때의 움직임을 정한다(js/canvas-stage-roster.js). */
const GAIT_BY_TRAVEL = { 비행: 'fly', 부유: 'float', 유영: 'swim', 구르기: 'roll', 기어가기: 'crawl' };
const read = file => decodePng(fs.readFileSync(file));
const middle = list => list.slice().sort((a, b) => a - b)[Math.floor(list.length / 2)];

function gaitOf(id, travel, group) {
    if (/slime/.test(id)) return 'hop';
    if (/worm/.test(id)) return 'crawl';
    return GAIT_BY_TRAVEL[travel] || (group === 'wisps' ? 'float' : 'legs');
}
/** 한 장에서 프레임 하나: 그림 안의 칸과, 그 칸 안의 발 자리. */
const frame = (png, x, y, size, feet) => ({ png, x, y, w: size[0], h: size[1], feet });
/** 격자로 놓인 시트의 프레임들(가로 cols칸씩). */
function gridFrames(png, size, cols, count, feet) {
    return Array.from({ length: count }, (_, f) => frame(png, (f % cols) * size[0], Math.floor(f / cols) * size[1], size, feet));
}
/** 프레임에서 차 있는 도트의 상자, 발 자리 기준(왼쪽, 위, 오른쪽, 아래). 빈 프레임은 null. */
function boxOf(cell) {
    let left = cell.w, right = -1, top = cell.h, bottom = -1;
    for (let y = 0; y < cell.h; y++) for (let x = 0; x < cell.w; x++) {
        if (cell.png.data[((cell.y + y) * cell.png.width + cell.x + x) * 4 + 3] < 128) continue;
        if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y;
    }
    return right < 0 ? null : [left - cell.feet[0], top - cell.feet[1], right - cell.feet[0], bottom - cell.feet[1]];
}
/** 프레임들을 같은 상자(발 자리 기준)로 잘라 한 줄에 COLUMNS칸씩 놓은 그림. */
function atlas(frames, box) {
    const w = box[2] - box[0] + 1, h = box[3] - box[1] + 1, cols = Math.min(COLUMNS, frames.length), rows = Math.ceil(frames.length / cols);
    const data = new Uint8Array(w * cols * h * rows * 4);
    frames.forEach((cell, f) => {
        const ox = (f % cols) * w, oy = Math.floor(f / cols) * h;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const sx = cell.x + cell.feet[0] + box[0] + x, sy = cell.y + cell.feet[1] + box[1] + y;
            if (sx < cell.x || sy < cell.y || sx >= cell.x + cell.w || sy >= cell.y + cell.h) continue;
            const at = (sy * cell.png.width + sx) * 4;
            if (cell.png.data[at + 3] < 128) continue;
            data.set([cell.png.data[at], cell.png.data[at + 1], cell.png.data[at + 2], 255], ((oy + y) * w * cols + ox + x) * 4);
        }
    });
    return { png: encodePng(w * cols, h * rows, data), cols };
}

// ------------------------------------------------------------------ 처음 받은 88종
const window = {};
// eslint-disable-next-line no-eval -- 정리 폴더의 목록은 window.ROSTER = {...}; 한 줄짜리 자료 파일이다
eval(fs.readFileSync(path.join(from, 'data.js'), 'utf8'));
const motions = new Map(JSON.parse(fs.readFileSync(path.join(from, '..', 'motions.json'), 'utf8')).entries.map(entry => [entry.id, entry]));
function firstBatch(actor) {
    const entry = motions.get(actor.id), size = [actor.size, actor.size];
    // 윗몸 움직임을 넣은 걷기가 따로 있으면 그것을 쓴다(받은 걷기는 윗몸이 굳어 있다)
    const shown = actor.versions.find(version => version.key === 'claude' && version.walk.src.startsWith('fixed/')) || actor.versions[0];
    const walk = read(path.join(from, shown.walk.src)), attack = read(path.join(from, actor.versions[0].attack.src)), attackMs = actor.versions[0].attack.ms;
    let hit = attackMs.length - 1, passed = 0;
    for (let f = 0; f < attackMs.length; f++) { if (passed >= (entry.impactStartMs || 0)) { hit = f; break; } passed += attackMs[f]; }
    return {
        id: actor.id, name: actor.name, gait: gaitOf(actor.id, entry.travelLabel, ''),
        walk: { frames: gridFrames(walk, size, shown.walk.ms.length, shown.walk.ms.length, actor.feet), ms: shown.walk.ms, pace: 'stride' },
        attack: { frames: gridFrames(attack, size, attackMs.length, attackMs.length, actor.feet), ms: attackMs, hit }
    };
}

// ------------------------------------------------------------------ 새 묶음(--forge)
/** 확인 끝난 동작 하나: 격자 시트와 프레임 수, 초당 프레임 수, 타격 프레임. 떠 있는 몬스터는 그림의 기준점이 쉬는 자세의
 * 몸 아래 끝이라, 그림자가 놓일 바닥은 그보다 hover만큼 아래다. */
function forgeClip(dir, hover) {
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'animation.json'), 'utf8')), page = meta.fallback.pages[0];
    const feet = [meta.sourceAnchor[0], meta.sourceAnchor[1] + hover];
    return {
        frames: gridFrames(read(path.join(dir, page.file)), meta.fallback.cellSize, page.columns, meta.frameCount, feet),
        ms: +(1000 / meta.fps).toFixed(2), hit: meta.hitEvents[0] ? meta.hitEvents[0].frame : null, pace: 'time'
    };
}
/** 고른 외형 한 장: 도트로 정리해(반투명 없애기, 색 줄이기) 걷기 한 프레임으로 쓴다. */
function forgeStill(dir, actor) {
    const png = tidy(read(path.join(dir, actor.master)), { colours: actor.bodyHeight < 70 ? 32 : actor.bodyHeight < 130 ? 40 : 48, rim: false, accents: true });
    return { frames: [frame(png, 0, 0, [png.width, png.height], actor.sourceFeet)], ms: [1000], pace: 'stride' };
}
function forgeBatch(dir) {
    const production = JSON.parse(fs.readFileSync(path.join(dir, 'production.json'), 'utf8'));
    const ready = new Map(JSON.parse(fs.readFileSync(path.join(dir, 'delivery-summary.json'), 'utf8')).readyActors.map(actor => [actor.id, actor.actions]));
    const out = new Map();
    for (const actor of production.actors.filter(row => row.decision === 'keep')) {
        const master = read(path.join(dir, actor.master)), rows = boxOf(frame(master, 0, 0, [master.width, master.height], actor.sourceFeet));
        const hover = Math.max(0, -rows[3] - 1), actions = new Map((ready.get(actor.id) || []).map(action => [action.action, path.join(dir, action.package)]));
        const base = { id: actor.id, name: actor.name, gait: gaitOf(actor.id, (motions.get(actor.id) || {}).travelLabel, actor.group) };
        if (actions.has('walk')) out.set(actor.id, { ...base, walk: forgeClip(actions.get('walk'), hover), attack: actions.has('attack') ? forgeClip(actions.get('attack'), hover) : null });
        else if (!motions.has(actor.id)) out.set(actor.id, { ...base, walk: forgeStill(dir, actor), attack: null });
    }
    return out;
}

/** 새 동작이 아직 없는 위습 외형은 같은 속성의 새 위습 그림을 빌려 입는다(data/wisp-sprites.js WISP_SPRITE_BY_VISUAL의 속성).
 * 속성에 새 그림이 없으면(지금은 화염과 독) 처음 받은 제 그림 그대로다. 외형마다 새 동작이 오면 이 표에서 빠진다. */
function wispWears(made) {
    const data = {};
    global.safeExposeData = table => Object.assign(data, table);
    require(path.join(root, 'data/wisp-sprites.js'));
    const byElement = new Map();
    for (const id of made) if (data.WISP_SPRITE_BY_VISUAL[id] && !byElement.has(data.WISP_SPRITE_BY_VISUAL[id])) byElement.set(data.WISP_SPRITE_BY_VISUAL[id], id);
    return Object.entries(data.WISP_SPRITE_BY_VISUAL).filter(([id, element]) => !made.includes(id) && byElement.has(element)).map(([id, element]) => [id, byElement.get(element)]);
}

// ------------------------------------------------------------------ 옮기기
const actors = new Map(window.ROSTER.actors.map(actor => [actor.id, firstBatch(actor)]));
const counts = { first: actors.size, moving: 0, still: 0 }, moving = [];
if (forge) for (const [id, actor] of forgeBatch(forge)) {
    counts[actor.walk.frames.length > 1 ? 'moving' : 'still']++;
    if (actor.walk.frames.length > 1) moving.push(id);
    if (actors.has(id)) counts.first--;
    actors.set(id, actor);
}
const outDir = path.join(root, 'assets/enemies/roster'), folders = [outDir, mirror].filter(Boolean), written = new Set(), stamp = crypto.createHash('sha1');
folders.forEach(folder => fs.mkdirSync(folder, { recursive: true }));
function save(file, png) {
    written.add(file);
    stamp.update(file).update(png);
    folders.forEach(folder => fs.writeFileSync(path.join(folder, file), png));
}
const clipText = clip => `[${clip.n}, ${clip.cols}, ${Array.isArray(clip.ms) ? `[${clip.ms.join(', ')}]` : clip.ms}, ${typeof clip.extra === 'string' ? `'${clip.extra}'` : clip.extra}]`;
const rows = [];
for (const actor of actors.values()) {
    const clips = [actor.walk, actor.attack].filter(Boolean), boxes = clips.flatMap(clip => clip.frames.map(boxOf)).filter(Boolean);
    const box = [Math.min(...boxes.map(b => b[0])) - PAD, Math.min(...boxes.map(b => b[1])) - PAD, Math.max(...boxes.map(b => b[2])) + PAD, Math.max(...boxes.map(b => b[3])) + PAD];
    const walk = atlas(actor.walk.frames, box), attack = actor.attack ? atlas(actor.attack.frames, box) : null;
    save(`${actor.id}-walk.png`, walk.png);
    if (attack) save(`${actor.id}-attack.png`, attack.png);
    const walkBoxes = actor.walk.frames.map(boxOf).filter(Boolean), stand = boxOf((actor.attack || actor.walk).frames[0]);
    rows.push(`        ['${actor.id}', '${actor.name.replace(/'/g, "\\'")}', ${box[2] - box[0] + 1}, ${box[3] - box[1] + 1}, ${-box[0]}, ${-box[1]}, ${-stand[1]}, `
        + `${middle(walkBoxes.map(b => b[2] - b[0] + 1))}, '${actor.gait}', `
        + `${clipText({ n: actor.walk.frames.length, cols: walk.cols, ms: actor.walk.ms, extra: actor.walk.pace })}, `
        + `${attack ? clipText({ n: actor.attack.frames.length, cols: attack.cols, ms: actor.attack.ms, extra: actor.attack.hit }) : 'null'}]`);
}

const version = stamp.digest('hex').slice(0, 10), wears = wispWears(moving);
const text = `// 옆에서 보는 무대의 몬스터 새 그림(docs/stage-view-20261011.md): node scripts/build-stage-roster.cjs가 쓴다. 손으로 고치지 않는다.
// 몬스터마다 걷기와 공격 두 장(오른쪽을 보는 그림, 한 줄에 cols칸, 도트 하나 = 캐릭터 도트 하나)이고, 두 장은 칸 크기와 발 자리가 같다.
// 그림은 저장소에 없다(assets/enemies/roster/, 로컬에만 둔다). 없는 곳에서는 앞서 쓰던 그림으로 그린다(js/canvas-stage-roster.js).
// 스토리 보스는 그림 키(enemy.bossAssetKey)가 id와 같으면 이 그림을 쓴다.
// 걸음새(gait): legs 다리로 걷는다, hop 통통 뛴다, crawl 기어간다, roll 굴러간다, fly, float, swim 떠서 움직인다.
// 걷기 [프레임 수, cols, 프레임 시간(ms, 하나면 모두 같다), 맞추는 기준]: stride 걸어온 거리(한 바퀴 = 몸 너비의 0.7배), time 시간.
//   프레임이 하나뿐이면 걷기 그림이 없는 몬스터다: 게임이 그 한 장을 움직여 걷는 척한다.
// 공격 [프레임 수, cols, 프레임 시간, 타격 프레임] 또는 null(공격 그림이 없다: 서 있는 그림을 앞으로 내밀어 때린다).
const MONSTER_STAGE_ROSTER = Object.freeze({
    path: 'assets/enemies/roster/',
    /** 그림 묶음의 지문: 그림을 이 값과 함께 불러, 칸이 바뀐 그림을 브라우저가 예전 것으로 쓰지 않게 한다. */
    version: '${version}',
    /** 제 새 그림이 아직 없어 다른 외형의 그림을 빌려 입는 외형(위습: 같은 속성의 새 그림). */
    wears: Object.freeze({ ${wears.map(([id, other]) => `'${id}': '${other}'`).join(', ')} }),
    // [id, 이름, 칸 가로, 칸 세로, 발 x, 발 y, 몸 높이, 몸 너비, 걸음새, 걷기, 공격]
    actors: Object.freeze(Object.fromEntries([
${rows.join(',\n')}
    ].map(([id, name, w, h, feetX, feetY, height, width, gait, walk, attack]) => {
        const times = clip => Object.freeze(Array.isArray(clip[2]) ? clip[2] : Array(clip[0]).fill(clip[2]));
        return [id, Object.freeze({
            id, name, w, h, feet: Object.freeze([feetX, feetY]), height, width, gait, stride: Math.max(24, Math.round(width * 0.7)),
            walkMs: times(walk), walkCols: walk[1], pace: walk[3], still: walk[0] === 1,
            attackMs: attack ? times(attack) : null, attackCols: attack ? attack[1] : 0, impactFrame: attack ? attack[3] : 0
        })];
    })))
});

safeExposeData({ MONSTER_STAGE_ROSTER });
`;
fs.writeFileSync(path.join(root, 'data/monster-stage-roster.js'), text);
// 이번에 쓰지 않은 걷기와 공격 그림(예: 공격 그림이 없어진 몬스터의 옛 공격)만 치운다. 폴더의 다른 파일은 건드리지 않는다.
for (const folder of folders) for (const name of fs.readdirSync(folder)) {
    if (/-(walk|attack)\.png$/.test(name) && !written.has(name)) fs.unlinkSync(path.join(folder, name));
}
const bytes = fs.readdirSync(outDir).reduce((sum, name) => sum + fs.statSync(path.join(outDir, name)).size, 0);
console.log(`몬스터 ${rows.length}마리: 처음 받은 그림 ${counts.first}, 새 묶음의 동작 ${counts.moving}, 새 묶음의 한 장 ${counts.still}`);
console.log(`그림 ${fs.readdirSync(outDir).length}장 (${(bytes / 1048576).toFixed(1)}MB) → assets/enemies/roster/${mirror ? ' 와 ' + mirror : ''}`);
