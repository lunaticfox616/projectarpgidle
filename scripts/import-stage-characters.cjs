#!/usr/bin/env node
/* 리그닌 모션 공방 전달본(2026-10-20 사용자가 PixelLab으로 만든 6직업 × 7무기 모션)을 무대 주인공의 그림과 규격으로 옮긴다.
 *
 *   node scripts/import-stage-characters.cjs <모션 전달본 폴더>
 *
 * <폴더>/모션/<직업>/<직업>_<무기>_<모션>.png와 같은 이름의 .json(장 크기, 열 수, 장 수, ms, 타격 장, 반복, 배치)을 읽어
 *   assets/playable/stage/<직업 id>/<무기 id>/<모션 id>.png   가로 한 줄 시트: 모션마다 모든 장을 담는 가장 작은 칸, 0번 장이 왼쪽
 *   assets/playable/stage/<직업 id>/unarmed/rise.png          처음 장면에서 일어나는 동작: 맨손 사망의 장을 거꾸로 이은 것
 *   data/stage-characters.js                                 규격
 * 으로 옮긴다. 그 여섯 직업 폴더는 지우고 새로 만든다. 이름은 scripts/lib/stage-motion-ids.cjs. 규칙은 스킬룬 전달본 v42(2026-10-20)의
 * 캐릭터 아틀라스와 같다:
 *  - 발 기준점: 직업 × 무기의 대기 0번 장의 발(가장 아래 그려진 줄, 그 위 여섯 줄 점들의 가로 가운데)에 모션 배치(dx, dy)를 더한다.
 *    장 크기가 대기와 다르거나 모션 0번 장의 발이 그보다 3점 넘게 떨어지면 그 모션 0번 장의 발.
 *  - 타격 장: JSON hit_frames(0번 = 기준 그림). 활 사격과 플라스크 투척은 7번(시위를 놓는 장, 뒤로 감았다 앞으로 뿌리는 장. 공방 값
 *    6번은 당긴 끝, 감은 끝이다). 공방에서 손으로 바꾼 타격 장(hit_frames_table과 다를 때)은 그대로 둔다.
 *  - 장별 ms: ms, 타격 장은 hit_ms, 끝 장은 last_ms.
 *  - 광과민(2026-10-11 사용자 규칙, 시뮬레이터의 '광과민 안전'이 기본으로 켜진 모습): 0번 장보다 흰빛이 250점 넘게(2.2배 넘게) 늘거나
 *    청록과 파랑 발광이 250점 넘게 는 장은 그 앞의 괜찮은 장으로 바꿔 담는다.
 *  - lift: 장마다 그림의 맨 아래가 발바닥보다 뜬 높이의 가장 큰 값(도약, 공중제비: js/canvas-stage-skill-runes.js가 코드 포물선을 낮춘다).
 *  - 소환은 넣지 않는다(스킬룬 전달본이 그 줄을 지웠고 쓰는 룬이 없다).
 * 점 하나 바꾸지 않고(키우거나 줄이지 않는다) 담는다. 전달본 안의 스크립트는 실행하지 않는다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decodePng, encodePng } = require('./lib/png.cjs');
const { CLASS_IDS, STANCE_IDS, MOTION_IDS, idOf } = require('./lib/stage-motion-ids.cjs');

const root = path.resolve(__dirname, '..');
const OUT = path.join(root, 'assets/playable/stage');
const RETIRED = new Set(['소환']);
/** 써 낸 시트 모두의 해시: 그림을 부르는 주소의 ?v= (이름이 같아도 칸이 바뀌면 브라우저가 옛 그림을 쓰지 않게). */
const sheetHash = crypto.createHash('sha1');
function writeSheet(file, buffer) {
    sheetHash.update(file).update(buffer);
    fs.writeFileSync(path.join(OUT, file), buffer);
}
const FIXED_HITS = Object.freeze({ '활|공격': 7, '플라스크|투척': 7 });
const FOOT_ROWS = 6, ANCHOR_SLACK = 3, LIFT_MIN = 4;
const SAFE = Object.freeze({ white: 250, whiteTimes: 2.2, glow: 250 });
/** 맞을 때의 모습(붉은 외곽선, 밀림, 멈칫)과 걷기 배율: 2026-10-11 던파식 정리 묶음의 공용 규칙 그대로(새 전달본에는 없다). */
const SHARED = Object.freeze({
    hit: { outlinePx: 1, comboMs: 333, steps: [{ ms: 90, outline: '#e8403c', back: 0, hold: true }, { ms: 60, outline: '#9c3236', back: 2, hold: false },
        { ms: 60, outline: null, back: 1, hold: false }] },
    move: { rateMin: 0.5, rateMax: 2 }
});

function fail(message) { console.error(message); process.exit(1); }

/** 시트의 장들: { w, h, data(RGBA) }. 반투명 점은 128을 기준으로 있음과 없음으로 나눈다(공방 결과는 이미 0과 255). */
function framesOf(spec, sheet) {
    const { w, h } = spec.frame, out = [];
    if (sheet.width < spec.columns * w || sheet.height < Math.ceil(spec.frames / spec.columns) * h) fail(`${spec.name}: 시트가 JSON의 장 수보다 작습니다.`);
    for (let i = 0; i < spec.frames; i++) {
        const x0 = (i % spec.columns) * w, y0 = Math.floor(i / spec.columns) * h, data = Buffer.alloc(w * h * 4);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const from = ((y0 + y) * sheet.width + x0 + x) * 4, to = (y * w + x) * 4;
                if (sheet.data[from + 3] < 128) continue;
                sheet.data.copy(data, to, from, from + 3);
                data[to + 3] = 255;
            }
        }
        out.push({ w, h, data });
    }
    return out;
}
const drawn = (frame, x, y) => frame.data[(y * frame.w + x) * 4 + 3] > 0;

/** 발: 가장 아래 그려진 줄(y)과 그 위 FOOT_ROWS줄에 그려진 점들의 가로 가운데(x). 빈 장이면 null. */
function footOf(frame) {
    let lowest = -1;
    for (let y = frame.h - 1; y >= 0 && lowest < 0; y--) for (let x = 0; x < frame.w; x++) if (drawn(frame, x, y)) { lowest = y; break; }
    if (lowest < 0) return null;
    let sum = 0, count = 0;
    for (let y = Math.max(0, lowest - FOOT_ROWS + 1); y <= lowest; y++) for (let x = 0; x < frame.w; x++) if (drawn(frame, x, y)) { sum += x; count++; }
    return { x: sum / count, y: lowest };
}

/** 그 장의 흰빛(밝기 200 이상) 점 수와 청록, 파랑 발광(가장 밝은 성분 200 이상, 채도 0.45 넘게, 파랑이 빨강보다 셈) 점 수. */
function lightOf(frame) {
    let white = 0, glow = 0;
    for (let i = 0; i < frame.data.length; i += 4) {
        if (!frame.data[i + 3]) continue;
        const r = frame.data[i], g = frame.data[i + 1], b = frame.data[i + 2], max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (0.299 * r + 0.587 * g + 0.114 * b >= 200) white++;
        if (max >= 200 && (max - min) / Math.max(max, 1) > 0.45 && b > r) glow++;
    }
    return { white, glow };
}
/** 광과민으로 바꿔 담는 장의 번호들(0번은 기준 그림이라 늘 괜찮다). */
function flaggedFrames(frames) {
    const first = lightOf(frames[0]), out = [];
    for (let i = 1; i < frames.length; i++) {
        const now = lightOf(frames[i]);
        if ((now.white - first.white >= SAFE.white && now.white >= SAFE.whiteTimes * Math.max(first.white, 1)) || now.glow - first.glow >= SAFE.glow) out.push(i);
    }
    return out.length < frames.length ? out : [];
}

function anchorOf(spec, frame0, idle) {
    const own = footOf(frame0), placement = spec.placement || {};
    if (!own) fail(`${spec.name}: 0번 장이 비어 있습니다.`);
    if (spec.frame.w === idle.w) {
        const expected = { x: idle.foot.x + (placement.dx || 0), y: idle.foot.y + (placement.dy || 0) };
        if (Math.abs(own.x - expected.x) <= ANCHOR_SLACK && Math.abs(own.y - expected.y) <= ANCHOR_SLACK) return { x: Math.round(expected.x), y: expected.y };
    }
    return { x: Math.round(own.x), y: own.y };
}

function hitsOf(spec, weapon, frames) {
    let hits = [].concat(spec.hit_frames || []);
    const hasTable = Object.prototype.hasOwnProperty.call(spec, 'hit_frames_table'), table = hasTable ? (spec.hit_frames_table || []).map(h => h + 1) : null;
    if (!hasTable && spec.frames === (spec.requested_frames || spec.frames) + 1) hits = hits.map(h => h + 1);
    const fixed = FIXED_HITS[`${weapon}|${spec.file}`];
    if (fixed !== undefined && (!table || JSON.stringify(table) === JSON.stringify(hits))) hits = [fixed];
    return frames > 1 ? [...new Set(hits.map(h => Math.min(frames - 1, h)))].sort((a, b) => a - b) : [];
}
function msOf(spec, hits, frames) {
    const ms = Array(frames).fill(spec.ms);
    if (spec.hit_ms) hits.forEach(h => { ms[h] = spec.hit_ms; });
    if (spec.last_ms && frames > 1) ms[frames - 1] = spec.last_ms;
    return ms.every(value => value === ms[0]) ? ms[0] : ms;
}

/** 모든 장의 그려진 점을 담는 가장 작은 상자. */
function unionBox(frames) {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (const frame of frames) for (let y = 0; y < frame.h; y++) for (let x = 0; x < frame.w; x++) {
        if (!drawn(frame, x, y)) continue;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
/** 그림의 맨 아래가 발바닥보다 뜬 높이(점)의 가장 큰 값. */
function liftOf(frames, anchor) {
    let lift = 0;
    for (const frame of frames) {
        const foot = footOf(frame);
        if (foot) lift = Math.max(lift, anchor.y - (foot.y + 1));
    }
    return lift;
}
/** 장들을 상자 크기 칸으로 잘라 가로 한 줄로 잇는다. */
function stripOf(frames, box) {
    const width = box.w * frames.length, data = Buffer.alloc(width * box.h * 4);
    frames.forEach((frame, i) => {
        for (let y = 0; y < box.h; y++) frame.data.copy(data, (y * width + i * box.w) * 4, ((box.y + y) * frame.w + box.x) * 4, ((box.y + y) * frame.w + box.x + box.w) * 4);
    });
    return encodePng(width, box.h, data);
}

/** 전달본의 모션 JSON들: 직업 → 무기 → [{ spec, png }]. */
function readPackage(pack) {
    const byClass = {};
    for (const job of fs.readdirSync(path.join(pack, '모션'))) {
        const dir = path.join(pack, '모션', job);
        for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.json'))) {
            const spec = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
            if (RETIRED.has(spec.file)) continue;
            const byWeapon = byClass[spec.job] = byClass[spec.job] || {};
            (byWeapon[spec.weapon] = byWeapon[spec.weapon] || []).push({ spec, png: path.join(dir, file.replace(/\.json$/, '.png')) });
        }
    }
    return byClass;
}

function importMotion(row, weapon, idle, target) {
    const frames = framesOf(row.spec, decodePng(fs.readFileSync(row.png)));
    const anchor = anchorOf(row.spec, frames[0], idle), lift = liftOf(frames, anchor);
    const flagged = flaggedFrames(frames), shown = frames.map((frame, i) => { let k = i; while (k > 0 && flagged.includes(k)) k--; return frames[k]; });
    const box = unionBox(shown), hits = hitsOf(row.spec, weapon, frames.length);
    writeSheet(target, stripOf(shown, box));
    const clip = { frames: frames.length, ms: msOf(row.spec, hits, frames.length) };
    if (row.spec.loop) clip.loop = true;
    if (hits.length) clip.hit = hits;
    Object.assign(clip, { w: box.w, h: box.h, ax: anchor.x - box.x, ay: anchor.y - box.y });
    if (lift >= LIFT_MIN) clip.lift = lift;
    clip.file = target;
    return { clip, shown, box, flagged };
}

function importStance(classId, weapon, rows) {
    const stance = idOf(STANCE_IDS, weapon, '무기'), idleRow = rows.find(row => row.spec.file === '대기');
    if (!idleRow) fail(`${classId} ${weapon}: 대기 모션이 없습니다.`);
    const idleFrame = framesOf(idleRow.spec, decodePng(fs.readFileSync(idleRow.png)))[0];
    const idle = { w: idleRow.spec.frame.w, foot: footOf(idleFrame) };
    fs.mkdirSync(path.join(OUT, classId, stance), { recursive: true });
    const set = {}, flaggedList = [];
    for (const row of rows.sort((a, b) => a.spec.file.localeCompare(b.spec.file))) {
        const motion = idOf(MOTION_IDS, row.spec.file, '모션'), done = importMotion(row, weapon, idle, `${classId}/${stance}/${motion}.png`);
        set[motion] = done.clip;
        if (done.flagged.length) flaggedList.push(`${weapon} ${row.spec.file} ${done.flagged.join(',')}`);
        if (motion === 'death' && stance === 'unarmed') writeSheet(`${classId}/${stance}/rise.png`, stripOf([...done.shown].reverse(), done.box));
    }
    for (const need of ['idle', 'walk']) if (!set[need]) fail(`${classId} ${weapon}: ${need} 모션이 없습니다.`);
    return { stance, set, flaggedList };
}

/** 일반 자료를 줄마다 하나의 동작으로 적는다(다시 가져올 때 바뀐 동작만 diff에 보이게). */
function tableText(data) {
    const lines = [`const STAGE_CHARACTERS = Object.freeze({ source: ${JSON.stringify(data.source)}, path: ${JSON.stringify(data.path)}, version: ${JSON.stringify(data.version)},`,
        `    hit: ${JSON.stringify(data.hit)},`, `    move: ${JSON.stringify(data.move)},`, '    classes: {'];
    for (const [classId, entry] of Object.entries(data.classes)) {
        lines.push(`        ${classId}: { label: ${JSON.stringify(entry.label)}, weapons: {`);
        for (const [stance, set] of Object.entries(entry.weapons)) {
            lines.push(`            ${stance}: {`);
            lines.push(Object.entries(set).map(([motion, clip]) => `                ${motion}: ${JSON.stringify(clip)}`).join(',\n'));
            lines.push('            },');
        }
        lines.push('        } },');
    }
    lines.push('    }', '});');
    return lines.join('\n');
}

function main() {
    const pack = process.argv[2];
    if (!pack || !fs.existsSync(path.join(pack, '모션'))) fail('쓰는 법: node scripts/import-stage-characters.cjs <모션 전달본 폴더(모션/ 이 있는 곳)>');
    const byClass = readPackage(pack), classes = {}, flagged = [];
    let sheets = 0;
    for (const [job, classId] of Object.entries(CLASS_IDS)) {
        if (!byClass[job]) fail(`${job}: 전달본에 이 직업이 없습니다.`);
        fs.rmSync(path.join(OUT, classId), { recursive: true, force: true });
        const weapons = {};
        for (const weapon of Object.keys(STANCE_IDS)) {
            if (!byClass[job][weapon]) fail(`${job} ${weapon}: 전달본에 이 무기가 없습니다.`);
            const done = importStance(classId, weapon, byClass[job][weapon]);
            weapons[done.stance] = done.set;
            sheets += Object.keys(done.set).length;
            done.flaggedList.forEach(line => flagged.push(`${job} ${line}`));
        }
        if (!weapons.unarmed.death) fail(`${job}: 맨손 사망이 없습니다(처음 장면의 일어나기).`);
        classes[classId] = { label: job, weapons };
    }
    const readme = path.join(pack, '00_먼저_읽기.md');
    const title = fs.existsSync(readme) ? fs.readFileSync(readme, 'utf8').split('\n')[0].replace(/^#\s*/, '').trim() : path.basename(path.resolve(pack));
    const data = { source: title, path: 'assets/playable/stage/', version: sheetHash.digest('hex').slice(0, 10), ...SHARED, classes };
    const header = [
        '// Generated by scripts/import-stage-characters.cjs: 리그닌 모션 공방 전달본(2026-10-20, 직업 6 × 무기 7)의 규격. 직접 고치지 말고 다시 가져온다.',
        '// 모션마다 가로 한 줄 시트(칸 w × h, 0번 장이 왼쪽), 오른쪽을 보는 그림만(왼쪽은 좌우 반전). (ax, ay)는 칸 안의 발 기준점(발바닥 가운데).',
        '// motion: frames, ms(모든 장이 같으면 숫자 하나), loop, hit(타격 장들, 0부터), w, h, ax, ay, lift(그림이 뜨는 높이, 도약과 공중제비), file.',
        '// version: 모든 시트의 해시, 그림 주소의 ?v=(js/canvas-stage-actors.js).',
        '// 맨손 사망을 거꾸로 이은 <직업>/unarmed/rise.png는 처음 장면의 일어나기다(시간은 data/stage-view.js STAGE_HERO_RISE, 칸은 사망과 같다).'
    ].join('\n');
    fs.writeFileSync(path.join(root, 'data/stage-characters.js'), `${header}\n${tableText(data)}\nsafeExposeData({ STAGE_CHARACTERS });\n`);
    console.log(`직업 ${Object.keys(classes).length}개, 시트 ${sheets}장(일어나기 ${Object.keys(classes).length}장 따로) → assets/playable/stage, data/stage-characters.js`);
    console.log(`광과민으로 앞 장을 담은 모션 ${flagged.length}개:\n  ${flagged.join('\n  ')}`);
}

main();
