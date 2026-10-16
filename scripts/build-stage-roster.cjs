#!/usr/bin/env node
/* 무대 몬스터의 새 그림(걷기와 공격)을 게임이 읽는 모양으로 옮긴다(docs/stage-view-20261011.md).
 *
 *   node scripts/build-stage-roster.cjs <정리한 그림 폴더> [복사해 둘 폴더] [--forge <새 묶음 폴더>] [--looks <새 외형 선택.json>]
 *     [--roots <무기 뿌리 묶음 폴더>] [--actions <동작 묶음 폴더>] [--attacks <적 공격 효과 묶음 폴더>]
 *
 * 그림이 오는 곳은 둘이다.
 *   <정리한 그림 폴더>: 처음 받은 88종을 도트로 정리해 둔 곳(data.js, fixed/<id>/walk.png과 attack.png, 그 위 폴더의 motions.json).
 *   --forge: 영상에서 뽑아 다듬은 새 묶음(sprite-forge-selected-v1). delivery-summary.json의 확인 끝난 동작(readyActors)과,
 *     production.json에서 남기기로 고른 외형(decision keep)의 한 장 그림(master.png)을 쓴다.
 *     targeted-data.json이 있으면 거기 적힌 동작(확인 끝난 것)이 같은 동작의 앞선 판을 덮고, 그 파일의 boss(동작 한 벌)도 넣는다.
 *   --looks: 다시 만든 외형 가운데 사용자가 고른 것(검토 화면에서 내보낸 파일, choice keep이고 version이 같은 것)을 한 장 그림으로 넣는다.
 *   --roots: 무기 뿌리촉수 여섯의 새 그림(root-weapon-attack 묶음, 2026-10-15): 대기 한 장과 공격 여섯 장(rootBatch).
 *   --actions: 칸마다 한 장씩 그린 동작 묶음 하나(animation.json의 actions.move와 actions.attack, 2026-10-16 부제나비): actionsBatch.
 *   --attacks: 적 공격 효과 묶음(boss-vfx-20261016, 2026-10-16 사용자: "몬스터가 자연스럽게 사용하는지도 중요해")의 보스 공격 동작.
 *     게임에 공격 그림이 없는 보스(review-data.json의 category가 regular가 아니고 actors/<id>/animation.json의 gameAttackPresent가
 *     false)에만 공격으로 넣는다(attackBatch). 일반 적의 새 공격은 아직 넣지 않는다. 서 있는
 *     그림은 그대로다. 그 동작의 프레임마다 효과가 나오는 자리는 scripts/build-boss-fx.cjs가 이 표를 보고 맞춘다(다시 돌린다).
 *   새 묶음의 그림이 게임에서 다른 자리에 서면 FORGE_SLOT에 적는다(예: 부제나비는 액트 3 보스 그림 키 bossAct3).
 *   같은 생김새에 색만 다른 외형은 FORGE_TINTS에 적는다: 동작이 온 외형의 걷기와 공격을 제 색으로 옮겨 쓴다(--no-tint로 끈다).
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
const args = process.argv.slice(2), OPTIONS = ['--forge', '--looks', '--roots', '--actions', '--attacks'];
const option = name => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const forge = option('--forge'), looksFile = option('--looks'), rootsDir = option('--roots'), actionsDir = option('--actions'), attacksDir = option('--attacks');
const [from, mirror] = args.filter((arg, index) => !arg.startsWith('--') && !OPTIONS.includes(args[index - 1]));
if (!from) { console.error('쓰는 법: node scripts/build-stage-roster.cjs <정리한 그림 폴더> [복사해 둘 폴더] [--forge <새 묶음 폴더>] [--looks <새 외형 선택.json>] [--roots <무기 뿌리 묶음 폴더>] [--actions <동작 묶음 폴더>]'); process.exit(1); }
const PAD = 2, COLUMNS = 12;
/** 걸음새: 걷는 그림을 고르는 방식과, 그림 없이 걷는 척할 때의 움직임을 정한다(js/canvas-stage-roster.js). */
const GAIT_BY_TRAVEL = { 비행: 'fly', 부유: 'float', 유영: 'swim', 구르기: 'roll', 기어가기: 'crawl' };
const AIRBORNE = ['fly', 'float', 'swim'];   // 떠서 움직이는 걸음새(js/canvas-stage-roster.js와 같다)
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
/** 핵심 자세 몇 장으로 된 동작(rignin.image-keyframes.v1): 시트 안의 칸과 프레임마다의 시간, 타격 프레임이 적혀 있다. */
function forgeKeyframes(dir, hover) {
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'animation.json'), 'utf8')), sheet = read(path.join(dir, meta.spriteSheet));
    const feet = [meta.anchor[0], meta.anchor[1] + hover];
    for (const row of meta.frames) if (row.rect[0] + row.rect[2] > sheet.width || row.rect[1] + row.rect[3] > sheet.height) throw new Error(dir + ': 칸이 시트 밖이다');
    return { frames: meta.frames.map(row => frame(sheet, row.rect[0], row.rect[1], [row.rect[2], row.rect[3]], feet)), ms: meta.durationsMs, hit: meta.hitFrame, pace: 'time' };
}
/** 동작 하나: 폴더의 animation.json이 어느 모양인지 보고 읽는다. */
function forgeAction(dir, hover) {
    return JSON.parse(fs.readFileSync(path.join(dir, 'animation.json'), 'utf8')).fallback ? forgeClip(dir, hover) : forgeKeyframes(dir, hover);
}
/** 다시 만든 외형 한 장(이미 도트로 마감된 그림: 색을 다시 줄이지 않는다). 사용자가 그 판을 고르지 않았으면 null. */
function forgeLook(dir, actor, decision, hover) {
    if (!actor.redesign || !decision || decision.choice !== 'keep' || decision.version !== actor.redesign.version) return null;
    const at = path.join(dir, path.dirname(actor.redesign.preview), 'pixel'), finish = JSON.parse(fs.readFileSync(path.join(at, 'finish.json'), 'utf8'));
    const png = read(path.join(at, 'frames/frame_0000.png')), feet = [finish.canvas.anchor[0], finish.canvas.anchor[1] + hover];
    return { frames: [frame(png, 0, 0, [png.width, png.height], feet)], ms: [1000], pace: 'stride' };
}
/** 새 묶음의 그림이 게임에서 서는 자리: id(스토리 보스는 그림 키), 걸음새, 떠 있는 높이(도트, 발 자리에서 몸 아래 끝까지).
 * 표에 없으면 그림의 id 그대로이고, 걸음새와 높이는 고른 원본에서 정한다. */
const FORGE_SLOT = Object.freeze({
    'deacon-butterfly': { id: 'bossAct3', gait: 'fly', hover: 20 },                       // 액트 3 보스(이름도 부제나비). 기근의 맹수는 다른 데 쓰려고 남겨 둔다
    boss: { id: 'bossAct10_2', name: '고치에서 태어난 존재', gait: 'float', hover: 12 }    // targeted-data.json의 boss: 꽃봉오리 머리의 여섯 팔
});
/** 고른 외형 한 장: 도트로 정리해(반투명 없애기, 색 줄이기) 걷기 한 프레임으로 쓴다. */
function forgeStill(dir, actor) {
    const png = tidy(read(path.join(dir, actor.master)), { colours: actor.bodyHeight < 70 ? 32 : actor.bodyHeight < 130 ? 40 : 48, rim: false, accents: true });
    return { frames: [frame(png, 0, 0, [png.width, png.height], actor.sourceFeet)], ms: [1000], pace: 'stride' };
}
const readJson = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback);
/** 몬스터마다 확인 끝난 동작의 폴더: delivery-summary.json의 목록 위에 targeted-data.json의 더 새로운 판을 덮는다. */
function forgeReady(dir, targeted) {
    const ready = new Map();
    const note = (id, action, folder) => ready.set(id, new Map(ready.get(id) || []).set(action, path.join(dir, folder)));
    for (const actor of readJson(path.join(dir, 'delivery-summary.json'), { readyActors: [] }).readyActors) for (const action of actor.actions) note(actor.id, action.action, action.package);
    for (const actor of targeted.actors || []) for (const action of actor.actions) if (action.ready && action.reviewed) note(actor.id, action.action, path.dirname(action.preview.sheet));
    return ready;
}
/** 고른 원본에서 잰 떠 있는 높이: 발 자리가 그림의 아래 끝보다 얼마나 아래인가. 발 자리가 적혀 있지 않으면 0. */
function forgeHover(dir, actor) {
    if (!actor.sourceFeet) return 0;
    const master = read(path.join(dir, actor.master)), rows = boxOf(frame(master, 0, 0, [master.width, master.height], actor.sourceFeet));
    return Math.max(0, -rows[3] - 1);
}
/** 동작 한 벌뿐인 그림(targeted-data.json의 boss): 걷기 그림이 없으니 그 동작의 첫 자세 한 장으로 서고 걷는다. */
function forgeBoss(dir, boss, slot) {
    const attack = forgeKeyframes(path.join(dir, path.dirname(boss.previewSheet)), slot.hover);
    return { id: slot.id, name: slot.name, gait: slot.gait, walk: { frames: [attack.frames[0]], ms: [1000], pace: 'stride' }, attack };
}
/** 같은 생김새에 색만 다른 외형(액트 6, 7, 8의 부제는 액트 2 부제의 색 바꿈이다): 동작이 온 쪽(오른쪽)의 걷기와 공격을 제 색으로 옮겨 쓴다.
 * 제 동작이 따로 오면 이 표에서 뺀다. --no-tint로 끄면 고른 한 장 그대로다. */
const FORGE_TINTS = Object.freeze(Object.fromEntries([6, 7, 8].flatMap(act => ['melee', 'ranged'].map(kind => [`deacon-act${act}-${kind}`, `deacon-act2-${kind}`]))));
const TINT_MIN = 10;   // 색 하나를 옮길 근거로 삼는 최소 도트 수
const rgbKey = (data, at) => (data[at] << 16) | (data[at + 1] << 8) | data[at + 2];
const rgbOf = key => [key >> 16, (key >> 8) & 255, key & 255];
const rgbFar = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const nearestKey = (keys, rgb) => keys.reduce((near, key) => (rgbFar(rgbOf(key), rgb) < rgbFar(rgbOf(near), rgb) ? key : near));
/** 동작 그림의 색마다, 그 색이 칠해진 자리(동작이 온 외형의 원본에서 그 색에 가장 가까운 도트들)에 색만 다른 외형이 쓴 색의 가운데 값.
 * 두 원본은 몸이 가장 많이 겹치는 자리로 맞춘다. 원본에 자리가 없는 색(타격 궤적 같은 효과)은 표에 넣지 않아 그대로 남는다. */
const solidAt = (png, x, y) => x >= 0 && y >= 0 && x < png.width && y < png.height && png.data[(y * png.width + x) * 4 + 3] > 127;
/** 두 원본을 겹칠 자리(to의 좌표 = from의 좌표 + 답): 적힌 발 자리는 몇 도트씩 어긋나 있어, 그 둘레에서 몸이 가장 많이 겹치는 자리를 고른다. */
function tintOffset(from, to, guess) {
    let best = guess, bestCount = -1;
    for (let dy = guess[1] - 4; dy <= guess[1] + 4; dy++) for (let dx = guess[0] - 10; dx <= guess[0] + 10; dx++) {
        let count = 0;
        for (let y = 0; y < from.height; y += 2) for (let x = 0; x < from.width; x += 2) if (solidAt(from, x, y) === solidAt(to, x + dx, y + dy)) count++;
        if (count > bestCount) { bestCount = count; best = [dx, dy]; }
    }
    return best;
}
function tintTable(dir, donor, variant, sheets) {
    const palette = new Set(), from = read(path.join(dir, donor.master)), to = read(path.join(dir, variant.master)), samples = new Map();
    const shift = tintOffset(from, to, [variant.sourceFeet[0] - donor.sourceFeet[0], variant.sourceFeet[1] - donor.sourceFeet[1]]);
    for (const sheet of sheets) for (let at = 0; at < sheet.data.length; at += 4) if (sheet.data[at + 3] > 127) palette.add(rgbKey(sheet.data, at));
    const keys = [...palette];
    for (let y = 0; y < from.height; y++) for (let x = 0; x < from.width; x++) {
        const at = (y * from.width + x) * 4, ox = x + shift[0], oy = y + shift[1];
        if (from.data[at + 3] < 128 || !solidAt(to, ox, oy)) continue;
        const key = nearestKey(keys, [from.data[at], from.data[at + 1], from.data[at + 2]]), other = (oy * to.width + ox) * 4;
        samples.set(key, (samples.get(key) || []).concat([[to.data[other], to.data[other + 1], to.data[other + 2]]]));
    }
    const table = new Map();
    for (const [key, list] of samples) if (list.length >= TINT_MIN) table.set(key, [0, 1, 2].map(c => middle(list.map(rgb => rgb[c]))));
    // 자리는 있는데 근거가 모자란 색: 가장 가까운 옮겨진 색이 움직인 만큼 따라 옮긴다
    const moved = [...table.keys()];
    for (const key of samples.keys()) {
        if (table.has(key) || !moved.length) continue;
        const near = nearestKey(moved, rgbOf(key)), was = rgbOf(near), now = table.get(near);
        table.set(key, rgbOf(key).map((value, c) => Math.max(0, Math.min(255, value + now[c] - was[c]))));
    }
    return table;
}
/** 시트 한 장을 색 표대로 옮긴 사본. */
function tintSheet(sheet, table) {
    const data = Uint8Array.from(sheet.data);
    for (let at = 0; at < data.length; at += 4) {
        const rgb = data[at + 3] > 127 ? table.get(rgbKey(data, at)) : null;
        if (rgb) data.set(rgb, at);
    }
    return { ...sheet, data };
}
/** 색만 다른 외형에 입힐 동작 한 벌: 동작이 온 외형의 걷기와 공격을 제 색으로 옮긴다. */
function forgeTinted(dir, production, clips, row) {
    const actorOf = id => production.actors.find(actor => actor.id === id), donor = actorOf(clips.id), variant = actorOf(row.id);
    const sheets = [...new Set([clips.walk, clips.attack].filter(Boolean).flatMap(clip => clip.frames.map(cell => cell.png)))];
    const table = tintTable(dir, donor, variant, sheets), copies = new Map(sheets.map(sheet => [sheet, tintSheet(sheet, table)]));
    const tinted = clip => (clip ? { ...clip, frames: clip.frames.map(cell => ({ ...cell, png: copies.get(cell.png) })) } : null);
    return { ...row, walk: tinted(clips.walk), attack: tinted(clips.attack) };
}
function forgeBatch(dir) {
    const production = JSON.parse(fs.readFileSync(path.join(dir, 'production.json'), 'utf8')), targeted = readJson(path.join(dir, 'targeted-data.json'), {});
    const ready = forgeReady(dir, targeted), decisions = looksFile ? JSON.parse(fs.readFileSync(looksFile, 'utf8')).decisions : {};
    const out = new Map();
    for (const actor of production.actors) {
        const slot = FORGE_SLOT[actor.id] || {}, hover = slot.hover ?? forgeHover(dir, actor), actions = ready.get(actor.id) || new Map();
        const base = { id: slot.id || actor.id, name: actor.name, gait: slot.gait || gaitOf(actor.id, (motions.get(actor.id) || {}).travelLabel, actor.group) };
        // 다시 만든 외형은 제 발 자리를 따로 가진 새 그림이다: 서 있는 몬스터는 원본에서 잰 높이를 쓰지 않는다(다리로 땅을 딛는다)
        const look = forgeLook(dir, actor, decisions[actor.id], AIRBORNE.includes(base.gait) ? hover : 0);
        if (look) out.set(base.id, { ...base, walk: look, attack: null });
        else if (actor.decision !== 'keep') continue;
        else if (actions.has('walk')) out.set(base.id, { ...base, walk: forgeAction(actions.get('walk'), hover), attack: actions.has('attack') ? forgeAction(actions.get('attack'), hover) : null });
        else if (!motions.has(actor.id)) out.set(base.id, { ...base, walk: forgeStill(dir, actor), attack: null });
    }
    for (const [id, donorId] of Object.entries(args.includes('--no-tint') ? {} : FORGE_TINTS)) {
        const clips = out.get(donorId), row = out.get(id);
        if (clips && row && clips.walk.frames.length > 1 && row.walk.frames.length === 1) out.set(id, forgeTinted(dir, production, clips, row));
    }
    if (targeted.boss) {
        // 그 자리에 앞서 넣은 그림은 견주어 볼 수 있게 다른 이름으로 남긴다(테스트 패널의 "몬스터 모습")
        const slot = FORGE_SLOT.boss, before = out.get(slot.id);
        if (before) out.set(slot.id + '-prev', { ...before, id: slot.id + '-prev', name: before.name + ' (이전 그림)' });
        out.set(slot.id, forgeBoss(dir, targeted.boss, slot));
    }
    return out;
}

// ------------------------------------------------------------------ 무기 뿌리촉수(--roots)
/** 무기 뿌리촉수 여섯의 새 그림(2026-10-15 사용자 "뿌리 몬스터 새로 만들었는데 다듬어줘"): animations.json에 무기마다 7칸 한 줄
 * 시트(왼쪽을 본다, 마지막 칸은 첫 칸과 같은 대기 자세), 밑동 기준점, 프레임 시간, 타격 프레임이 있다. 큰 그림을 줄인 것이라 도트마다
 * 색이 달라(칸마다 약 1,300색) 일곱 칸이 함께 쓰는 ROOT_COLOURS색으로 정리하고(프레임마다 색이 달라 반짝이지 않게), 칸마다 좌우를
 * 뒤집어 오른쪽을 보게 한다. 대기 한 장이 걷기, 공격 1~6번이 공격이다. 이름과 걸음새는 같은 id의 앞선 그림 것을 잇는다. */
const ROOT_COLOURS = 32;
function mirrorCells(png, cell) {
    const data = new Uint8Array(png.data.length);
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
        const start = x - (x % cell), from = (y * png.width + x) * 4, to = (y * png.width + start + cell - 1 - (x - start)) * 4;
        data.set(png.data.subarray(from, from + 4), to);
    }
    return { width: png.width, height: png.height, data };
}
function rootBatch(dir, previous) {
    const out = new Map();
    for (const anim of JSON.parse(fs.readFileSync(path.join(dir, 'animations.json'), 'utf8')).animations) {
        const [cw, ch] = anim.cell, sheet = mirrorCells(tidy(read(path.join(dir, anim.sheet)), { colours: ROOT_COLOURS, rim: false, accents: true }), cw);
        const id = `root-${anim.id}`, before = previous.get(id), feet = [cw - 1 - anim.root[0], anim.root[1]];
        const frames = gridFrames(sheet, [cw, ch], Math.round(sheet.width / cw), anim.attackFrames, feet);
        out.set(id, { id, name: before ? before.name : `${anim.name} 뿌리촉수`, gait: before ? before.gait : 'legs',
            walk: { frames: [frames[0]], ms: [1000], pace: 'stride' }, attack: { frames, ms: anim.durations.slice(0, anim.attackFrames), hit: anim.hitFrame } });
    }
    return out;
}

// ------------------------------------------------------------------ 동작 묶음(--actions)
/** 칸마다 한 장씩 그린 동작 묶음(2026-10-16 사용자: GPT가 새로 만든 부제나비): animation.json의 actions.move와 actions.attack이
 * 프레임 파일, 프레임 시간, 타격 프레임(impactFrame)을 적고, 모든 프레임은 같은 칸(cell)에 같은 기준점(registration.rest)으로 놓여
 * 있다(공격의 몸 내밀기도 그림에 들어 있다). 이미 도트로 마감된 그림이라 색을 다시 줄이지 않는다. 서는 자리, 걸음새, 떠 있는 높이는
 * FORGE_SLOT(meta.id)을 따르고, 발 자리는 쉬는 자세(move 첫 칸)의 몸 상자 가로 가운데, 아래 끝에서 떠 있는 높이만큼 아래다.
 * 날갯짓은 걸어온 거리가 아니라 시간으로 돈다. 이름은 같은 자리의 앞선 그림 것을 잇는다. */
function actionsBatch(dir, previous) {
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'animation.json'), 'utf8')), slot = FORGE_SLOT[meta.id] || {};
    const id = slot.id || meta.id, cell = [meta.cell.width, meta.cell.height], before = previous.get(id);
    const pngs = action => meta.actions[action].frames.map(row => read(path.join(dir, row.file)));
    const move = pngs('move'), attack = meta.actions.attack ? pngs('attack') : [], rest = boxOf(frame(move[0], 0, 0, cell, [0, 0]));
    const feet = [Math.round((rest[0] + rest[2]) / 2), rest[3] + 1 + (slot.hover || 0)];
    const clip = (list, action) => ({ frames: list.map(png => frame(png, 0, 0, cell, feet)), ms: meta.actions[action].frames.map(row => row.duration) });
    const actor = { id, name: before ? before.name : meta.name, gait: slot.gait || (before ? before.gait : 'legs'), walk: { ...clip(move, 'move'), pace: 'time' },
        attack: attack.length ? { ...clip(attack, 'attack'), hit: meta.actions.attack.impactFrame } : null };
    return new Map([[id, actor]]);
}

// ------------------------------------------------------------------ 보스 공격 동작(--attacks)
/** 공격 그림이 없는 보스에게 적 공격 효과 묶음의 공격 동작: 칸마다 한 장(attack-<n>.png, 칸 크기 size, 발 자리 anchor, 오른쪽을 본다),
 * 프레임 시간 durations, 타격 프레임 hitFrame. 걷기(서 있는 그림), 이름, 걸음새는 그대로 둔다. */
function attackBatch(dir, previous) {
    const out = new Map(), review = JSON.parse(fs.readFileSync(path.join(dir, 'review-data.json'), 'utf8'));
    const bosses = new Set(review.actors.filter(row => row.category !== 'regular').map(row => row.id));
    for (const [id, actor] of previous) {
        const at = path.join(dir, 'actors', id), file = path.join(at, 'animation.json');
        if (actor.attack || !bosses.has(id) || !fs.existsSync(file)) continue;
        const meta = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (meta.gameAttackPresent !== false || !meta.frames || !meta.frames.length) continue;
        const frames = meta.frames.map(name => frame(read(path.join(at, name)), 0, 0, meta.size, meta.anchor));
        out.set(id, { ...actor, attack: { frames, ms: meta.durations, hit: meta.hitFrame } });
    }
    return out;
}

/** 새 동작이 아직 없는 위습 외형은 같은 속성의 새 위습 그림을 빌려 입는다(data/wisp-sprites.js WISP_SPRITE_BY_VISUAL의 속성).
 * 속성에 새 그림이 없으면(지금은 화염과 독) 처음 받은 제 그림 그대로다. 외형마다 새 그림(own: 동작이든 한 장이든)이 오면 이 표에서 빠진다. */
function wispWears(made, own) {
    const data = {};
    global.safeExposeData = table => Object.assign(data, table);
    require(path.join(root, 'data/wisp-sprites.js'));
    const byElement = new Map();
    for (const id of made) if (data.WISP_SPRITE_BY_VISUAL[id] && !byElement.has(data.WISP_SPRITE_BY_VISUAL[id])) byElement.set(data.WISP_SPRITE_BY_VISUAL[id], id);
    return Object.entries(data.WISP_SPRITE_BY_VISUAL).filter(([id, element]) => !own.includes(id) && byElement.has(element)).map(([id, element]) => [id, byElement.get(element)]);
}

// ------------------------------------------------------------------ 옮기기
const actors = new Map(window.ROSTER.actors.map(actor => [actor.id, firstBatch(actor)]));
const counts = { first: actors.size, moving: 0, still: 0 }, moving = [], fromForge = [];
if (forge) for (const [id, actor] of forgeBatch(forge)) {
    counts[actor.walk.frames.length > 1 ? 'moving' : 'still']++;
    fromForge.push(id);
    if (actor.walk.frames.length > 1) moving.push(id);
    if (actors.has(id)) counts.first--;
    actors.set(id, actor);
}
if (rootsDir) for (const [id, actor] of rootBatch(rootsDir, actors)) {
    const replaced = actors.get(id);
    if (replaced) counts[!fromForge.includes(id) ? 'first' : replaced.walk.frames.length > 1 ? 'moving' : 'still']--;
    counts.roots = (counts.roots || 0) + 1;
    actors.set(id, actor);
}
if (actionsDir) for (const [id, actor] of actionsBatch(actionsDir, actors)) {
    const replaced = actors.get(id);
    if (replaced) counts[!fromForge.includes(id) ? 'first' : replaced.walk.frames.length > 1 ? 'moving' : 'still']--;
    counts.actions = (counts.actions || 0) + 1;
    actors.set(id, actor);
}
if (attacksDir) for (const [id, actor] of attackBatch(attacksDir, actors)) {
    counts.attacks = (counts.attacks || 0) + 1;
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
    const walkBoxes = actor.walk.frames.map(boxOf).filter(Boolean), stand = boxOf((actor.attack || actor.walk).frames[0]), still = walkBoxes[0];
    rows.push(`        ['${actor.id}', '${actor.name.replace(/'/g, "\\'")}', ${box[2] - box[0] + 1}, ${box[3] - box[1] + 1}, ${-box[0]}, ${-box[1]}, ${-stand[1]}, `
        + `${middle(walkBoxes.map(b => b[2] - b[0] + 1))}, '${actor.gait}', `
        + `${clipText({ n: actor.walk.frames.length, cols: walk.cols, ms: actor.walk.ms, extra: actor.walk.pace })}, `
        + `${attack ? clipText({ n: actor.attack.frames.length, cols: attack.cols, ms: actor.attack.ms, extra: actor.attack.hit }) : 'null'}, [${-still[0]}, ${still[2]}]]`);
}

const version = stamp.digest('hex').slice(0, 10), wears = wispWears(moving, fromForge);
const text = `// 옆에서 보는 무대의 몬스터 새 그림(docs/stage-view-20261011.md): node scripts/build-stage-roster.cjs가 쓴다. 손으로 고치지 않는다.
// 몬스터마다 걷기와 공격 두 장(오른쪽을 보는 그림, 한 줄에 cols칸, 도트 하나 = 캐릭터 도트 하나)이고, 두 장은 칸 크기와 발 자리가 같다.
// 그림은 저장소에 없다(assets/enemies/roster/, 로컬에만 둔다). 없는 곳에서는 앞서 쓰던 그림으로 그린다(js/canvas-stage-roster.js).
// 스토리 보스는 그림 키(enemy.bossAssetKey)가 id와 같으면 이 그림을 쓴다.
// 걸음새(gait): legs 다리로 걷는다, hop 통통 뛴다, crawl 기어간다, roll 굴러간다, fly, float, swim 떠서 움직인다.
// 걷기 [프레임 수, cols, 프레임 시간(ms, 하나면 모두 같다), 맞추는 기준]: stride 걸어온 거리(한 바퀴 = 몸 너비의 0.7배), time 시간.
//   프레임이 하나뿐이면 걷기 그림이 없는 몬스터다: 게임이 그 한 장을 움직여 걷는 척한다.
// 공격 [프레임 수, cols, 프레임 시간, 타격 프레임] 또는 null(공격 그림이 없다: 서 있는 그림으로 때린다).
// 품 [왼쪽, 오른쪽]: 서 있는 그림이 발에서 양옆으로 뻗은 도트(보스가 차지하는 칸 너비, js/combat-grid.js fitBossFootprint).
const MONSTER_STAGE_ROSTER = Object.freeze({
    path: 'assets/enemies/roster/',
    /** 그림 묶음의 지문: 그림을 이 값과 함께 불러, 칸이 바뀐 그림을 브라우저가 예전 것으로 쓰지 않게 한다. */
    version: '${version}',
    /** 제 새 그림이 아직 없어 다른 외형의 그림을 빌려 입는 외형(위습: 같은 속성의 새 그림). */
    wears: Object.freeze({ ${wears.map(([id, other]) => `'${id}': '${other}'`).join(', ')} }),
    // [id, 이름, 칸 가로, 칸 세로, 발 x, 발 y, 몸 높이, 몸 너비, 걸음새, 걷기, 공격, 품]
    actors: Object.freeze(Object.fromEntries([
${rows.join(',\n')}
    ].map(([id, name, w, h, feetX, feetY, height, width, gait, walk, attack, reach]) => {
        const times = clip => Object.freeze(Array.isArray(clip[2]) ? clip[2] : Array(clip[0]).fill(clip[2]));
        return [id, Object.freeze({
            id, name, w, h, feet: Object.freeze([feetX, feetY]), height, width, gait, stride: Math.max(24, Math.round(width * 0.7)),
            walkMs: times(walk), walkCols: walk[1], pace: walk[3], still: walk[0] === 1,
            attackMs: attack ? times(attack) : null, attackCols: attack ? attack[1] : 0, impactFrame: attack ? attack[3] : 0, reach: Object.freeze(reach)
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
console.log(`몬스터 ${rows.length}마리: 처음 받은 그림 ${counts.first}, 새 묶음의 동작 ${counts.moving}, 새 묶음의 한 장 ${counts.still}, 무기 뿌리촉수 ${counts.roots || 0}, 동작 묶음 ${counts.actions || 0}, 보스 공격 동작 ${counts.attacks || 0}`);
console.log(`그림 ${fs.readdirSync(outDir).length}장 (${(bytes / 1048576).toFixed(1)}MB) → assets/enemies/roster/${mirror ? ' 와 ' + mirror : ''}`);
