#!/usr/bin/env node
/* 보스의 공격 효과(GPT가 만든 적 공격 효과 묶음, boss-vfx-20261016)를 게임이 읽는 모양으로 옮기고 검수한다.
 *
 *   node scripts/build-boss-fx.cjs <boss-vfx 폴더> [복사해 둘 폴더] [--check]
 *
 * <boss-vfx 폴더>: review-data.json(적마다 효과 크기 fxScale, 몸 크기 scale, 공격 프레임마다 효과가 나오는 자리 points,
 *   종류 kind, category 'regular'이면 일반 적), actors/<id>/effects.json(효과 시트 sheet, 프레임마다 칸 rect와 기준점 anchor,
 *   준비 charge, 날아감 action, 맞음 impact 세 줄의 프레임 시간), actors/<id>/animation.json(공격 프레임의 기준점, 원본 그림).
 * 보스(category가 regular가 아닌 것) 가운데 게임 무대의 그림 묶음(data/monster-stage-roster.js)에 있는 외형만 옮긴다.
 * 검수(넘으면 멈춘다): 시트 64KB 이하, 색 48 이하, 알파는 0과 255만, 프레임 그림이 칸 가장자리에 닿지 않는다(잘린 그림),
 *   기준점이 칸 안. GPT의 몸 그림은 게임 그림과 도트 크기가 같다(같은 그림에서 왔다): 효과 자리(points)를 그대로 쓴다.
 * 쓰는 곳: assets/stage-vfx/boss-fx/<시트>.png(투명한 화소의 색을 이웃 색으로 채운다: 그림을 줄여 그릴 때 테두리에 원본의 바탕색
 *   (회청색, 검정)이 번지지 않게. 생성한 보스 효과는 저장소에 넣는다), data/boss-fx.js(표). [복사해 둘 폴더]에도 그림을 똑같이 둔다.
 * --check: 쓰지 않고 검수만 한다. 원본은 읽기만 한다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { decodePng, encodePng } = require('./lib/png.cjs');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2), checkOnly = args.includes('--check'), refreshLinks = args.includes('--refresh-links');
const [from, mirror] = args.filter(arg => !arg.startsWith('--'));
if (!from && !refreshLinks) { console.error('쓰는 법: node scripts/build-boss-fx.cjs <boss-vfx 폴더> [복사해 둘 폴더] [--check], 또는 --refresh-links'); process.exit(1); }
const LIMIT = Object.freeze({ bytes: 64 * 1024, colours: 48 });
const CELL = 160, COLS = 6, CLIPS = Object.freeze(['charge', 'action', 'impact']);
const problems = [];

function readRoster() {
    const source = fs.readFileSync(path.join(root, 'data/monster-stage-roster.js'), 'utf8');
    const sandbox = { safeExposeData: rows => Object.assign(sandbox, rows), Object };
    vm.createContext(sandbox);
    vm.runInContext(source.replace(/^const /mg, 'var '), sandbox);
    return sandbox.MONSTER_STAGE_ROSTER;
}

/** The opaque box of a picture region: [x0, y0, x1, y1] (inclusive) or null. */
function opaqueBox(png, rect) {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (let y = rect[1]; y < rect[1] + rect[3]; y++) {
        for (let x = rect[0]; x < rect[0] + rect[2]; x++) {
            if (png.data[(y * png.width + x) * 4 + 3] === 0) continue;
            x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
    }
    return x1 < 0 ? null : [x0 - rect[0], y0 - rect[1], x1 - rect[0], y1 - rect[1]];
}

function sheetStats(png, bytes) {
    const colours = new Set();
    let semi = 0;
    for (let i = 0; i < png.data.length; i += 4) {
        const a = png.data[i + 3];
        if (a === 255) colours.add((png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]);
        else if (a > 0) semi++;
    }
    return { bytes, colours: colours.size, semi };
}

/** Transparent pixels take the colour of an opaque neighbour (a few rings out), so a picture drawn smaller does not show the
 * source's background colour round its edges. Alpha stays as it was. */
function bleedEdges(png) {
    const { width, height, data } = png, filled = new Uint8Array(width * height);
    for (let i = 0; i < filled.length; i++) filled[i] = data[i * 4 + 3] !== 0 ? 1 : 0;
    const neighbour = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy])
        .find(([nx, ny]) => nx >= 0 && ny >= 0 && nx < width && ny < height && filled[ny * width + nx] === 1);
    for (let ring = 0; ring < 4; ring++) {
        const added = [];
        for (let i = 0; i < filled.length; i++) {
            if (filled[i]) continue;
            const near = neighbour(i % width, Math.floor(i / width));
            if (near) added.push([i, (near[1] * width + near[0]) * 4]);
        }
        for (const [i, from] of added) {
            data[i * 4] = data[from]; data[i * 4 + 1] = data[from + 1]; data[i * 4 + 2] = data[from + 2];
            filled[i] = 1;
        }
    }
    return png;
}

function checkSheet(id, file, png, stats) {
    if (stats.bytes > LIMIT.bytes) problems.push(`${id}: ${path.basename(file)} ${Math.round(stats.bytes / 1024)}KB > 64KB`);
    if (stats.colours > LIMIT.colours) problems.push(`${id}: ${stats.colours}색 > ${LIMIT.colours}`);
    if (stats.semi) problems.push(`${id}: 반투명 화소 ${stats.semi}개`);
    if (png.width !== CELL * COLS || png.height !== CELL * CLIPS.length) problems.push(`${id}: 시트 ${png.width}x${png.height}`);
}

/** One frame: [cell index, anchor x, y, opaque x0, x1] (the opaque columns, for a beam's head, body and tail). */
function frameRecord(id, png, frame) {
    const [x, y, w, h] = frame.rect, box = opaqueBox(png, frame.rect), index = (y / CELL) * COLS + x / CELL;
    if (w !== CELL || h !== CELL || !Number.isInteger(index)) problems.push(`${id}: ${frame.clip} ${frame.index} 칸 ${frame.rect}`);
    if (box && (box[0] === 0 || box[1] === 0 || box[2] === w - 1 || box[3] === h - 1)) problems.push(`${id}: ${frame.clip} ${frame.index} 그림이 칸 끝에 닿는다(잘림)`);
    const [ax, ay] = frame.anchor;
    if (ax < 0 || ay < 0 || ax >= w || ay >= h) problems.push(`${id}: ${frame.clip} ${frame.index} 기준점이 칸 밖`);
    return [index, ax, ay, box ? box[0] : ax, box ? box[2] : ax, frame.flipX ? 1 : 0];
}

/** Where the effect comes out on each of the game's attack frames, from the boss's feet (dots). GPT placed its points on the attack it
 * drew (animation.json); the game's attack clip may be another one (2026-10-21: the all-monster 6-frame draft, data/monster-stage-roster.js).
 * The points scale with the body (the game's first attack frame against GPT's, both measured up from the feet) and the game's frames take
 * GPT's by their place before and after the release (the clip's impact frame meets GPT's releaseFrame). No attack clip: the first point. */
function emitPoints(profile, animation, actor, gptHeight) {
    const [ax, ay] = animation.anchor, frames = actor.attackMs ? actor.attackMs.length : 0;
    const k = gptHeight > 0 && actor.height > 0 ? actor.height / gptHeight : 1;
    const points = profile.points.map(([x, y]) => [Math.round((x - ax) * k), Math.round((y - ay) * k)]);
    if (!frames || points.length < 2) return [points[0]];
    if (points.length === frames) return points;
    const hit = Math.min(frames - 1, actor.impactFrame || 0), release = Math.min(points.length - 1, profile.releaseFrame ?? hit);
    const at = f => (f <= hit ? Math.round(f * release / Math.max(1, hit))
        : release + Math.round((f - hit) * (points.length - 1 - release) / Math.max(1, frames - 1 - hit)));
    return Array.from({ length: frames }, (_, f) => points[at(f)]);
}
/** The height GPT's first attack frame stands above its anchor (dots): the body GPT's points were placed on. */
function gptBodyHeight(dir, animation) {
    const png = decodePng(fs.readFileSync(path.join(dir, animation.frames[0]))), box = opaqueBox(png, [0, 0, png.width, png.height]);
    return box ? animation.anchor[1] - box[1] : 0;
}

function clipsOf(id, effects, sheets) {
    const clips = {};
    for (const clip of CLIPS) {
        const rows = effects.frames.filter(frame => frame.clip === clip).sort((a, b) => a.index - b.index);
        const file = rows[0] && rows[0].file ? path.resolve(effects.dir, path.dirname(rows[0].file), 'effects.png') : path.resolve(effects.dir, effects.sheet);
        const key = path.basename(path.dirname(file)), png = sheets.get(key) || readSheet(id, key, file, sheets);
        clips[clip] = { sheet: key, ms: effects.durations[clip], frames: rows.map(frame => frameRecord(id, png, frame)) };
    }
    return clips;
}

function readSheet(id, key, file, sheets) {
    const bytes = fs.readFileSync(file), png = decodePng(bytes);
    checkSheet(id, file, png, sheetStats(png, bytes.length));
    sheets.set(key, png);
    return png;
}

function actorRow(id, dir, profile, actor, sheets) {
    const effects = { ...JSON.parse(fs.readFileSync(path.join(dir, 'effects.json'), 'utf8')), dir };
    const animation = JSON.parse(fs.readFileSync(path.join(dir, 'animation.json'), 'utf8')), gptHeight = gptBodyHeight(dir, animation);
    const body = gptHeight > 0 && actor.height > 0 ? actor.height / gptHeight : 1;   // the effect keeps its size against the body
    return {
        kind: profile.kind,
        scale: Math.round(profile.fxScale / profile.scale * body * 1000) / 1000,
        impactScale: profile.impactScale || 1,
        emit: emitPoints(profile, animation, actor, gptHeight),
        clips: clipsOf(id, effects, sheets)
    };
}

function build() {
    const review = JSON.parse(fs.readFileSync(path.join(from, 'review-data.json'), 'utf8')), roster = readRoster(), sheets = new Map(), actors = {};
    for (const profile of review.actors) {
        const dir = path.join(from, 'actors', profile.id), actor = roster.actors[profile.id];
        if (profile.category === 'regular' || !actor || !fs.existsSync(path.join(dir, 'effects.json'))) continue;
        actors[profile.id] = actorRow(profile.id, dir, profile, actor, sheets);
    }
    applyRuntimeLinks(actors);
    return { actors, sheets };
}

// Authored emission points for reviewed replacement bodies; reuse existing effect art at its native proportions.
function applyRuntimeLinks(actors) {
    const links = JSON.parse(fs.readFileSync(path.join(root, 'data/boss-fx-links.json'), 'utf8'));
    const roster = readRoster();
    for (const [id, link] of Object.entries(links)) {
        const source = actors[link.source], actor = roster.actors[id];
        if (!source || !actor || link.emit.length !== actor.attackMs.length) throw Error('Invalid boss FX link: ' + id);
        const { source: _source, ...own } = link;
        actors[id] = { ...source, ...own };
    }
}

function refreshRuntimeLinks() {
    const file = path.join(root, 'data/boss-fx.js'), text = fs.readFileSync(file, 'utf8');
    const sandbox = { safeExposeData: values => Object.assign(sandbox, values) };
    vm.createContext(sandbox); vm.runInContext(text, sandbox);
    applyRuntimeLinks(sandbox.BOSS_FX.actors);
    fs.writeFileSync(file, text.replace(/const BOSS_FX = Object.freeze\(.*\);/, 'const BOSS_FX = Object.freeze(' + JSON.stringify(sandbox.BOSS_FX) + ');'));
    console.log('Reviewed boss effect links refreshed; existing sheets unchanged.');
}

function writeOut({ actors, sheets }) {
    const target = path.join(root, 'assets/stage-vfx/boss-fx'), hash = crypto.createHash('sha1');
    fs.mkdirSync(target, { recursive: true });
    if (mirror) fs.mkdirSync(mirror, { recursive: true });
    for (const [key, png] of [...sheets].sort()) {
        const bytes = encodePng(png.width, png.height, bleedEdges(png).data);
        hash.update(bytes);
        fs.writeFileSync(path.join(target, `${key}.png`), bytes);
        if (mirror) fs.writeFileSync(path.join(mirror, `${key}.png`), bytes);
    }
    const table = { path: 'assets/stage-vfx/boss-fx/', version: hash.digest('hex').slice(0, 10), cell: CELL, cols: COLS, actors };
    const text = `// 보스의 공격 효과(GPT가 만든 적 공격 효과, boss-vfx-20261016): node scripts/build-boss-fx.cjs가 쓴다. 손으로 고치지 않는다.\n`
        + `// 생성한 보스 효과는 assets/stage-vfx/boss-fx/에 게임과 함께 보관한다. 없는 곳에서는 효과 없이 예고와 판정만 남는다(js/canvas-boss-moves.js).\n`
        + `// 외형 id → kind(GPT가 정한 공격 방식: melee, projectile, ground, wave, beam, fall), scale(몸 도트 하나에 효과 화소 몇 개),\n`
        + `// impactScale, emit(게임의 공격 프레임마다 효과가 나오는 자리, 발에서 도트), clips(charge 준비, action 날아감, impact 맞음:\n`
        + `// sheet 시트, ms 프레임 시간, frames [칸 번호, 기준점 x, y, 그림의 왼쪽 끝 x, 오른쪽 끝 x, 좌우 뒤집기]).\n`
        + `const BOSS_FX = Object.freeze(${JSON.stringify(table)});\n\nsafeExposeData({ BOSS_FX });\n`;
    fs.writeFileSync(path.join(root, 'data/boss-fx.js'), text);
    console.log(`보스 ${Object.keys(actors).length}종, 시트 ${sheets.size}장 → assets/stage-vfx/boss-fx, data/boss-fx.js`);
}

if (refreshLinks) { refreshRuntimeLinks(); process.exit(0); }
const result = build();
console.log(`검수: 보스 ${Object.keys(result.actors).length}종, 시트 ${result.sheets.size}장, 문제 ${problems.length}건`);
problems.forEach(line => console.log('  ' + line));
if (problems.length) process.exit(1);
if (!checkOnly) writeOut(result);
