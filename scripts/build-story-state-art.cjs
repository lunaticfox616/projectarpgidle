#!/usr/bin/env node
/* 장면 상태 그림(GPT가 만든 묶음)을 무대가 읽는 시트와 표로 옮긴다.
 *
 *   node scripts/build-story-state-art.cjs <장면 상태 그림 폴더> [--recolor <다시 칠한 묶음의 after 폴더>] [--check]
 *
 * <장면 상태 그림 폴더>: story-state-art-20261016(manifest.json의 clips: id, kind, frames, width, height, anchor, durations).
 *   보스 쓰러짐(kind boss)은 data/monster-stage-roster.js의 쓰러짐 그림이라 여기서는 옮기지 않는다(scripts/build-stage-roster.cjs --deaths).
 * --recolor: 같은 id의 프레임을 다시 칠한 묶음(worldtree-props-20261018/after, clips/<id>/NN.png): 칸 크기와 알파가 같아야 한다.
 * 프레임마다 그림이 차지하는 상자를 묶음 전체에서 하나로 잡아 잘라 가로로 잇고, 발 자리(anchor)를 그 상자 기준으로 옮긴다.
 * 쓰는 곳: assets/stage-story/<id>.png, data/stage-story-art.js(표). 원본은 읽기만 한다.
 * 다시 일어나는 보스(data/stage-view.js STAGE_STORY.revives와 같은 표를 여기 REVIVES에 둔다)는 쓰러짐 효과의 길이도 함께 적는다.
 * 검수(넘으면 멈춘다): 알파는 0과 255만, 그림이 칸 가장자리에 닿지 않는다, 다시 칠한 프레임은 원본과 크기, 알파가 같다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decodePng, encodePng } = require('./lib/png.cjs');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2), checkOnly = args.includes('--check');
const option = name => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : null; };
const recolor = option('--recolor');
const from = args.find((arg, i) => !arg.startsWith('--') && args[i - 1] !== '--recolor');
if (!from) { console.error('쓰는 법: node scripts/build-story-state-art.cjs <장면 상태 그림 폴더> [--recolor <after 폴더>] [--check]'); process.exit(1); }
/** 쓰러진 뒤 다시 일어나는 보스: 쓰러짐(4장, 마지막에 멈춤) → GAP 동안 누워 있다 → 일어남 → STAND 동안 서 있다 → FADE 동안 흐려진다. */
const REVIVES = Object.freeze({ bossAct2: Object.freeze({ clip: 'deacon-revive', gap: 300, stand: 500, fade: 400 }) });
const problems = [];

const manifest = JSON.parse(fs.readFileSync(path.join(from, 'manifest.json'), 'utf8'));
const read = file => decodePng(fs.readFileSync(file));
function frameFile(clip, index) {
    const name = path.basename(clip.frames[index]), again = recolor && path.join(recolor, 'clips', clip.id, name);
    return again && fs.existsSync(again) ? again : path.join(from, clip.frames[index]);
}
function opaqueBox(png) {
    let l = png.width, r = -1, t = png.height, b = -1;
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
        const a = png.data[(y * png.width + x) * 4 + 3];
        if (a !== 0 && a !== 255) problems.push(`반투명 화소 (${x}, ${y})`);
        if (a < 128) continue;
        l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y);
    }
    return r < 0 ? null : [l, t, r, b];
}
function sameAlpha(a, b) {
    if (a.width !== b.width || a.height !== b.height) return false;
    for (let i = 3; i < a.data.length; i += 4) if (a.data[i] !== b.data[i]) return false;
    return true;
}
function build(clip) {
    const frames = clip.frames.map((_, i) => read(frameFile(clip, i)));
    if (recolor) clip.frames.forEach((name, i) => {
        if (frameFile(clip, i) !== path.join(from, name) && !sameAlpha(frames[i], read(path.join(from, name)))) problems.push(`${clip.id} ${i + 1}: 다시 칠한 프레임의 크기나 알파가 다르다`);
    });
    const boxes = frames.map(opaqueBox).filter(Boolean);
    if (!boxes.length) { problems.push(`${clip.id}: 빈 묶음`); return null; }
    const box = [Math.min(...boxes.map(b => b[0])), Math.min(...boxes.map(b => b[1])), Math.max(...boxes.map(b => b[2])), Math.max(...boxes.map(b => b[3]))];
    if (box[0] === 0 || box[1] === 0 || box[2] === clip.width - 1 || box[3] === clip.height - 1) problems.push(`${clip.id}: 그림이 칸 가장자리에 닿는다(잘린 그림)`);
    const w = box[2] - box[0] + 1, h = box[3] - box[1] + 1, sheet = new Uint8Array(w * frames.length * h * 4);
    frames.forEach((png, index) => {
        for (let y = 0; y < h; y++) {
            const src = ((box[1] + y) * png.width + box[0]) * 4;
            sheet.set(png.data.subarray(src, src + w * 4), (y * w * frames.length + index * w) * 4);
        }
    });
    return { id: clip.id, kind: clip.kind, frames: frames.length, w, h, feet: [clip.anchor.x - box[0], clip.anchor.y - box[1]],
        ms: clip.durations.slice(), png: encodePng(w * frames.length, h, sheet), recolored: clip.frames.some((name, i) => frameFile(clip, i) !== path.join(from, name)) };
}
const sum = list => list.reduce((a, b) => a + b, 0);
const built = manifest.clips.filter(clip => clip.kind !== 'boss').map(build).filter(Boolean);
const deaths = new Map(manifest.clips.filter(clip => clip.kind === 'boss').map(clip => [clip.id, clip]));
const revives = Object.entries(REVIVES).map(([boss, rule]) => {
    const death = deaths.get(boss), clip = built.find(row => row.id === rule.clip);
    if (!death || !clip) { problems.push(`${boss}: 쓰러짐(${!!death})이나 일어남 그림(${!!clip})이 없다`); return null; }
    const start = sum(death.durations) + rule.gap, stand = start + sum(clip.ms) + rule.stand;
    return [boss, { clip: rule.clip, start, fadeFrom: stand, total: stand + rule.fade }];
}).filter(Boolean);
if (problems.length) { console.error(problems.slice(0, 20).join('\n')); process.exit(1); }

const version = crypto.createHash('sha1').update(Buffer.concat(built.map(row => row.png))).digest('hex').slice(0, 10);
const clipRows = built.map(row => `        '${row.id}': Object.freeze({ kind: '${row.kind}', frames: ${row.frames}, w: ${row.w}, h: ${row.h}, feet: Object.freeze([${row.feet.join(', ')}]), ms: Object.freeze([${row.ms.join(', ')}]) })`);
const reviveRows = revives.map(([boss, r]) => `        ${boss}: Object.freeze({ clip: '${r.clip}', start: ${r.start}, fadeFrom: ${r.fadeFrom}, total: ${r.total} })`);
const table = `// 장면 상태 그림(GPT, ${path.basename(path.resolve(from))}${recolor ? `, 다시 칠한 묶음 ${path.basename(path.dirname(path.resolve(recolor)))}` : ''}): node scripts/build-story-state-art.cjs가 쓴다.
// 손으로 고치지 않는다. 그림은 assets/stage-story/<id>.png(프레임을 가로로 이은 한 줄, 칸 w x h, 발 자리 feet, 도트 하나 = 캐릭터 도트 하나).
// kind: revive 보스가 다시 일어나는 그림, story 이야기 장면의 구조물(상태마다 한 장), prop 탐험 물체(재질마다, 온전함과 부서지거나 열린 모습).
// 어디에 언제 그리는지는 data/stage-view.js STAGE_STORY, 그리는 곳은 js/canvas-stage-story.js.
// revives: 쓰러진 뒤 다시 일어나는 보스의 쓰러짐 효과(ms): start 일어남이 시작하는 때, fadeFrom 흐려지기 시작하는 때, total 효과 길이.
const STAGE_STORY_ART = Object.freeze({
    path: 'assets/stage-story/',
    version: '${version}',
    clips: Object.freeze({
${clipRows.join(',\n')}
    }),
    revives: Object.freeze({
${reviveRows.join(',\n')}
    })
});

safeExposeData({ STAGE_STORY_ART });
`;
if (checkOnly) { console.log(`검수만: ${built.length}묶음, 다시 칠한 묶음 ${built.filter(row => row.recolored).length}, 문제 없음`); process.exit(0); }
const out = path.join(root, 'assets/stage-story');
fs.mkdirSync(out, { recursive: true });
for (const name of fs.readdirSync(out)) if (name.endsWith('.png') && !built.some(row => row.id + '.png' === name)) fs.unlinkSync(path.join(out, name));
for (const row of built) fs.writeFileSync(path.join(out, row.id + '.png'), row.png);
fs.writeFileSync(path.join(root, 'data/stage-story-art.js'), table);
console.log(`${built.length}묶음(다시 칠한 묶음 ${built.filter(row => row.recolored).length}), 다시 일어나는 보스 ${revives.length}, 그림 지문 ${version}`);
