#!/usr/bin/env node
/* 스킬룬 이펙트 묶음(2026-10-20 사용자가 준 "스킬룬 디렉터 전달" v42와 그 추가본 v44(바위 플라스크), v54(2026-10-24 사역룬 가호, 같은 경로에 덮어 쓴 폴더). 그 앞은 10-19 v36, 10-17 v32, 10-13 "스킬젬 리메이크 인계" v21:
 * 구매 팩에서 고른 이펙트 그림과 룬마다의 연결표)을 게임이 읽는 모양으로 옮긴다(docs/stage-view-20261011.md).
 *
 *   node scripts/build-stage-skill-vfx.cjs <인계 폴더> [복사해 둘 폴더]
 *
 * <인계 폴더>는 00_먼저_읽기.md(v21은 00_먼저_읽기_인계서.md)가 있는 폴더다. 여기서
 *   2_시뮬레이터/vfx/vfx.json, vfx.png      이펙트 그림 첫 장과 그 칸의 자리
 *   2_시뮬레이터/vfx/vfx2.json, vfx2.png    둘째 장(v32부터, 있으면): 칸 표에 im: 1이 붙는다
 *   2_시뮬레이터/src/gem_template.html      색 램프(RAMP), 클립(CLIPS), 무기 휘두름의 기본 클립(SWING_CLIP), 룬마다의 연결(VFXMAP),
 *                                           속성별 타격 묶음(HIT_POOL, v32부터)
 *   스킬룬_목록.json(v21은 젬_목록.json)     룬의 계열과 동작 슬롯, v32부터 직업과 무기 자세마다 쓰는 동작(motions)도
 *                                           (v42: 무기 대검, 한손검과 모션 공방의 모션 이름, scripts/lib/stage-motion-ids.cjs)
 * 을 읽어
 *   그림: assets/stage-vfx/vfx.png, vfx2.png (저장소에 넣지 않는다. 구매 팩에서 온 그림이라 다시 나눠 주면 안 된다). [복사해 둘 폴더]에도 둔다.
 *   표: data/stage-skill-vfx.js (수치와 이름만 있다).
 * 인계 폴더의 스크립트는 실행하지 않는다. 표는 글자로 읽어 풀고(값, 배열, 묶음만 받아들인다), 쓰이는 클립의 칸만 옮긴다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { CLASS_IDS, STANCE_IDS, MOTION_IDS, idOf } = require('./lib/stage-motion-ids.cjs');

const root = path.join(__dirname, '..');
const [from, mirror] = process.argv.slice(2);
if (!from) { console.error('쓰는 법: node scripts/build-stage-skill-vfx.cjs <인계 폴더> [복사해 둘 폴더]'); process.exit(1); }
const sim = path.join(from, '2_시뮬레이터');
const template = fs.readFileSync(path.join(sim, 'src/gem_template.html'), 'utf8');

// ---------------------------------------------------------------- reading a table as text
/** 값, 배열, 묶음만 있는 표 글을 푼다(이름 붙은 값, 따옴표 글, 수, 참과 거짓). 그 밖의 글자가 나오면 멈춘다: 코드는 읽지 않는다. */
function readLiteral(text) {
    let at = 0;
    const fail = why => { throw new Error(`표를 읽을 수 없다(${why}): …${text.slice(Math.max(0, at - 30), at + 30)}…`); };
    function skip() {
        for (;;) {
            if (/\s/.test(text[at] || '')) at++;
            else if (text.startsWith('//', at)) at = text.indexOf('\n', at) < 0 ? text.length : text.indexOf('\n', at);
            else if (text.startsWith('/*', at)) at = text.indexOf('*/', at) + 2;
            else return;
        }
    }
    function string() {
        const quote = text[at++]; let out = '';
        while (text[at] !== quote) { if (at >= text.length || text[at] === '\\' || text[at] === '\n') fail('글'); out += text[at++]; }
        at++;
        return out;
    }
    function word() {
        const hit = /^[A-Za-z_$][\w$]*/.exec(text.slice(at));
        if (!hit) fail('이름');
        at += hit[0].length;
        return hit[0];
    }
    function value() {
        skip();
        const c = text[at];
        if (c === '{') return object();
        if (c === '[') return array();
        if (c === '\'' || c === '"') return string();
        const number = /^-?\d+(\.\d+)?/.exec(text.slice(at));
        if (number) { at += number[0].length; return Number(number[0]); }
        const name = word();
        if (name === 'true' || name === 'false') return name === 'true';
        return fail('값 ' + name);
    }
    function array() {
        const out = []; at++;
        for (skip(); text[at] !== ']'; skip()) { out.push(value()); skip(); if (text[at] === ',') at++; else if (text[at] !== ']') fail('배열'); }
        at++;
        return out;
    }
    function object() {
        const out = {}; at++;
        for (skip(); text[at] !== '}'; skip()) {
            const key = text[at] === '\'' || text[at] === '"' ? string() : /\d/.test(text[at]) ? String(value()) : word();
            skip(); if (text[at++] !== ':') fail('쌍점');
            out[key] = value(); skip();
            if (text[at] === ',') at++; else if (text[at] !== '}') fail('묶음');
        }
        at++;
        return out;
    }
    const out = value();
    skip();
    if (at < text.length && text[at] !== ';') fail('끝');
    return out;
}
/** `const 이름 = { … };` 의 묶음 글: 여는 괄호부터 그 줄과 같은 들여쓰기의 닫는 괄호까지(한 줄짜리는 그 줄 끝까지, 줄 끝 주석은 뺀다).
 * 들여 쓴 표(v54: OLDFX 안의 룬 획 RUNES)도 읽는다. */
function tableText(name) {
    const start = template.indexOf(`const ${name} = {`);
    if (start < 0) throw new Error('표가 없다: ' + name);
    const indent = template.slice(template.lastIndexOf('\n', start) + 1, start);
    const open = template.indexOf('{', start), lineEnd = template.indexOf('\n', open);
    const oneLine = template.slice(open, lineEnd).replace(/\s*\/\/.*$/, '').trimEnd();
    if (oneLine.endsWith('};')) return oneLine.slice(0, -1);
    const close = template.indexOf('\n' + indent + '};', open);
    return template.slice(open, close + indent.length + 2);
}
const table = name => readLiteral(tableText(name));

const ramps = table('RAMP'), clips = table('CLIPS'), swingClips = table('SWING_CLIP'), gems = table('VFXMAP'), elementRamp = table('EL_RAMP');
/** 게임 쪽에서 덧붙이는 연결(인계는 그것을 제 코드 연출로 그린다): 전도성 난격이 벨 때마다의 작은 번개 튐은 인계의 flickerCutFx가 그리고,
 * 게임은 맞은 적의 타격 클립으로 띄운다(2026-10-19 v36 적용, js/canvas-stage-skill-runes.js runeHitRefs). */
const GAME_HOOKS = { 70: { hit: 'p_espark@light' } };
for (const [id, hooks] of Object.entries(GAME_HOOKS)) if (gems[id]) gems[id] = { ...gems[id], ...hooks };
/** 클립 표의 줄 주석 안에 들어가 버린 클립 줄(v32: "// 신성한 기도: 번개창이 꽂힌 자리 p_bow: {...}"로 활 발사 섬광 클립이 시뮬레이터에서도
 * 없어졌다. 시뮬레이터의 코드는 그 클립을 튼다): 주석 뒤의 "이름: { a: '원본', … }"을 살려 넣는다. */
const commentedClips = [];
for (const line of tableText('CLIPS').split('\n')) {
    const comment = line.indexOf('//');
    if (comment < 0) continue;
    for (const m of line.slice(comment).matchAll(/([A-Za-z_]\w*): (\{ a: '[^']+'[^}]*\})/g)) {
        if (clips[m[1]] || !(template.includes(`'${m[1]}@`) || template.includes(`'${m[1]}'`))) continue;   // 아무도 틀지 않는 클립은 살리지 않는다
        clips[m[1]] = readLiteral(m[2]);
        commentedClips.push(m[1]);
    }
}
// 속성의 세 색(코드로 그리는 연출이 쓴다): 이름은 빼고 색만 옮긴다.
const elements = Object.fromEntries(Object.entries(table('EL')).map(([key, row]) => [key, { c1: row.c1, c2: row.c2, c3: row.c3 }]));
const hitPool = template.includes('const HIT_POOL = {') ? table('HIT_POOL') : {};
/** 사역룬 가호의 발밑(v54, 2026-10-24 사역룬 추가본): 속성마다 바닥에 눕혀 도는 결정진 클립과 그 투명도, 돌기, 줄임(BLESS_VFX, none은 수액의
 * 가호), 도는 빠르기(BLESS_SPIN, 초당 라디안), 속성 표에 없는 수액의 가호 색(BLESS_COL), 둘레에 찍는 룬 글자의 획(RUNES, 5×7 격자, 가호가 쓰는
 * 글자만). v54 앞의 인계면 비운다. */
const hasBless = template.includes('const BLESS_VFX = {');
const blessFloors = hasBless ? table('BLESS_VFX') : {};
const blessSpin = Number((/const BLESS_SPIN = ([\d.]+);/.exec(template) || [])[1]) || 0;
const blessColours = hasBless && template.includes('const BLESS_COL = {') ? table('BLESS_COL') : {};
const runeStrokes = hasBless ? table('RUNES') : {};
/** 칸 표: 첫 장은 그대로, 둘째 장(vfx2)은 줄마다 im: 1을 붙여 합친다. */
const SHEETS = ['vfx', 'vfx2'].filter(name => fs.existsSync(path.join(sim, `vfx/${name}.json`)));
const atlasAll = {};
SHEETS.forEach((name, im) => {
    for (const [key, row] of Object.entries(JSON.parse(fs.readFileSync(path.join(sim, `vfx/${name}.json`), 'utf8')))) {
        if (atlasAll[key]) throw new Error('두 그림에 같은 이름: ' + key);
        atlasAll[key] = im ? { ...row, im } : row;
    }
});
const listFile = ['스킬룬_목록.json', '젬_목록.json'].map(name => path.join(from, name)).find(file => fs.existsSync(file));
const gemList = Object.values(JSON.parse(fs.readFileSync(listFile, 'utf8')));

// ---------------------------------------------------------------- what the game needs
const used = new Set(Object.values(clips).map(clip => clip.a));
const atlas = {};
for (const name of [...used].sort()) {
    const row = atlasAll[name];
    if (!row) throw new Error('그림에 없는 클립 원본: ' + name);
    atlas[name] = { w: row.w, h: row.h, n: row.n, p: row.p.map(value => Math.round(value * 10) / 10), fx: row.fx, fb: row.fb, ...(row.im ? { im: row.im } : {}) };
}
// 연결표가 가리키는 클립이 모두 있는지 본다.
const refsOf = value => (typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(refsOf) : value && typeof value === 'object' ? Object.values(value).flatMap(refsOf) : []);
// 클립이 아닌 글자: 'none' 끄기, 코드로 그리는 휘두름(pierce, rise), 옛 그림을 쓰는 룬(rune, clock, judgment)
const SPECIAL = new Set(['none', 'pierce', 'rise', 'rune', 'clock', 'judgment']);
for (const [pool, refs] of Object.entries(hitPool)) for (const ref of refs) if (!clips[ref.split('@')[0]]) throw new Error(`타격 묶음 ${pool}: 없는 클립 ${ref}`);
for (const [id, map] of Object.entries(gems)) for (const [hook, value] of Object.entries(map)) {
    if (hook === 'ramp' || hook === 'chop' || hook === 'old') continue;
    for (const ref of refsOf(value)) if (!SPECIAL.has(ref) && !clips[ref.split('@')[0]]) throw new Error(`룬 ${id}의 ${hook}: 없는 클립 ${ref}`);
}
/** 룬의 갈래: cast 시전 마법진을 띄운다(주문, 위습, 사역룬, 시전과 집중 슬롯), melee 근접 타격 모양을 쓴다(인계의 kind가 strike, whirl, move),
 * rune 사역룬이 발밑에 띄우는 룬 글자. */
const meta = {};
for (const gem of gemList) {
    meta[gem.id] = { name: gem.n, el: gem.el, cast: /시전|집중/.test(gem.slot) || ['spell', 'wisp', 'servant'].includes(gem.fam), melee: ['strike', 'whirl', 'move'].includes(gem.kind), kind: gem.kind,
        ...(gem.fam === 'servant' ? { rune: gem.p.rune } : {}) };
}
const blessRunes = {};
for (const row of Object.values(meta)) {
    if (!row.rune) continue;
    if (!runeStrokes[row.rune]) throw new Error(`사역룬 ${row.name}: 없는 룬 글자 ${row.rune}`);
    blessRunes[row.rune] = runeStrokes[row.rune];
}
for (const [element, row] of Object.entries(blessFloors)) if (!clips[String(row.floor).split('@')[0]]) throw new Error(`가호 ${element}: 없는 클립 ${row.floor}`);
/** 룬을 쓸 때 주인공이 하는 동작(v32부터의 motions): 룬 번호 → 직업 → 무기 자세 → data/stage-characters.js의 동작 이름('강타' → 'slam'). */
const heroSets = (() => {
    const sandbox = { safeExposeData: data => Object.assign(sandbox, data) };
    require('node:vm').runInNewContext(fs.readFileSync(path.join(root, 'data/stage-characters.js'), 'utf8'), sandbox);
    return sandbox.STAGE_CHARACTERS.classes;
})();
/** 시뮬레이터가 그림이 없어 대신 쓴 동작을 게임의 그림으로 되돌린다: 연금술사와 성직자 한손검의 회전은 v42 시뮬레이터의 그림에 없어 단타로
 * 대신했지만 10-20 모션 전달본(data/stage-characters.js)에는 있다. 회전 슬롯 룬(회오리, 얼어붙은 고리)은 그 그림이 있으면 회전이다.
 * 한손검으로 쓰는 투사체 룬(proj 계열)은 던진다(2026-10-20 사용자 결정, 시뮬레이터는 찌르기 끝에서 발사): 그 직업의 한손검 투척 그림이
 * 있으면 투척, 없으면(방랑자) 찌르기 그대로. */
function motionOf(gem, row, classId, stanceId) {
    const id = idOf(MOTION_IDS, row.m, '동작 이름'), set = heroSets[classId].weapons[stanceId];
    if (gem.fam === 'proj' && stanceId === 'sword' && set.throw) return 'throw';
    return id === 'attack' && /회전/.test(row.note || '') && set.spin ? 'spin' : id;
}
const motions = {};
for (const gem of gemList) {
    if (!gem.motions) continue;
    const byClass = {};
    for (const [classLabel, stances] of Object.entries(gem.motions)) {
        const classId = idOf(CLASS_IDS, classLabel, '직업');
        byClass[classId] = Object.fromEntries(Object.entries(stances).map(([stanceLabel, row]) => {
            const stanceId = idOf(STANCE_IDS, stanceLabel, '무기 자세');
            return [stanceId, motionOf(gem, row, classId, stanceId)];
        }));
    }
    motions[gem.id] = byClass;
}

const files = SHEETS.map(name => name + '.png'), hash = crypto.createHash('sha1');
for (const file of files) {
    const picture = fs.readFileSync(path.join(sim, 'vfx', file));
    hash.update(picture);
    for (const out of [path.join(root, 'assets/stage-vfx'), ...(mirror ? [mirror] : [])]) {
        fs.mkdirSync(out, { recursive: true });
        fs.writeFileSync(path.join(out, file), picture);
    }
}
const version = hash.digest('hex').slice(0, 10);
const megabytes = files.reduce((sum, file) => sum + fs.statSync(path.join(sim, 'vfx', file)).size, 0) / 1048576;

// ---------------------------------------------------------------- the table file
const q = value => JSON.stringify(value).replace(/"([A-Za-z_$][\w$]*)":/g, '$1:').replace(/"/g, '\'');
const rows = (object, indent) => Object.entries(object).map(([key, value]) => `${indent}${/^[A-Za-z_$][\w$]*$/.test(key) ? key : `'${key}'`}: ${q(value)}`).join(',\n');
const text = `// 스킬 이펙트 묶음 (js/canvas-stage-skill-vfx.js). scripts/build-stage-skill-vfx.cjs가 만든 표다: 손으로 고치지 않는다.
// 2026-10-20 사용자가 준 "스킬룬 디렉터 전달"(v42, 추가본 v44, v54)의 이펙트: 구매 팩에서 고른 이펙트 그림 두 장(assets/stage-vfx/vfx.png, vfx2.png,
// 저장소에 넣지 않는다)과 룬마다 어느 클립을 어느 때 쓰는지, 룬을 쓸 때의 동작. 룬의 판정, 무기 조건, 수치는 data/skills.js가 갖는다.
//   ramps   색 램프: 어두운 쪽에서 밝은 쪽으로 여섯 단계. 클립을 '이름@램프'로 부르면 그림의 밝기를 이 여섯 색으로 다시 칠한다('@='는 원래 색).
//   elementRamp 속성 → 램프. 룬이 램프를 정하지 않은 클립은 룬의 속성 색으로 칠한다.
//   elements 속성의 세 색(c1 밝은색, c2 중간색, c3 어두운색): 코드로 그리는 연출(마법진, 바늘, 창과 독니)이 쓴다.
//   atlas   클립 원본: w, h 한 칸의 크기, n 칸 수, p 밝기의 범위(다시 칠할 때의 기준), fx 칸마다의 자리, fb 칸마다 그림이 차지하는 상자,
//           im 그림 번호(files의 몇째 장, 없으면 첫 장).
//   clips   클립: a 원본, f 쓰는 칸의 처음과 끝, an 기준점(center 가운데, bottom 바닥, left 왼쪽, right 오른쪽), sc 배율, ms 한 칸의 시간,
//           loop 반복, one 넓은 범위에도 하나만, few 고리에 적게, small 타격 효과로 쓸 때 줄이지 않음, next 이어지는 클립, flat 바닥에 눕히는 비율.
//   swingClips 무기 휘두름의 기본 클립(룬이 휘두름을 정하지 않았을 때).
//   hitPool 속성별 타격 묶음: 룬이 타격을 정하지 않았으면 맞을 때마다 이 가운데 하나(physM 근접 물리, physR 그 밖의 물리, blood 피 램프).
//   gems    룬 번호(data/skill-fx-atlas.js의 id) → 훅: 클립. swing 휘두름, chop 내려찍기, impact 내려찍은 자리, hit 맞은 적, area 범위,
//           after 여진, wave 나아가는 파동, zap 연쇄 번개, fall 낙하, tick 지속 타격, muzzle 발사 섬광, blast 착탄 … (인계의 02_이펙트_연결표.md).
//   meta    룬 번호 → 인계의 룬 갈래: el 속성, cast 시전 마법진을 띄우는 룬, melee 근접 타격 모양을 쓰는 룬, kind 인계의 판정 갈래.
//   motions 룬 번호 → 직업 → 무기 자세 → 그 룬을 쓸 때의 동작(data/stage-characters.js의 동작 이름).
//   bless   사역룬 가호의 발밑(v54): spin 결정진과 룬 글자가 도는 빠르기(초당 라디안), floors 속성(none 수액) → 결정진 클립 floor, alpha 투명도
//           (없으면 0.85), spin 그 결정진만의 빠르기(0이면 돌지 않는다), scale 부드럽게 줄이는 배율, colours 속성 표에 없는 가호의 세 색,
//           runes 룬 글자의 획(5×7 격자의 선분 [x0, y0, x1, y1]).
const STAGE_SKILL_VFX = Object.freeze({
    path: 'assets/stage-vfx/',
    files: Object.freeze(${q(files)}),
    version: '${version}',
    ramps: Object.freeze({
${rows(ramps, '        ')}
    }),
    elementRamp: Object.freeze(${q(elementRamp)}),
    elements: Object.freeze({
${rows(elements, '        ')}
    }),
    swingClips: Object.freeze(${q(swingClips)}),
    hitPool: Object.freeze(${q(hitPool)}),
    clips: Object.freeze({
${rows(clips, '        ')}
    }),
    gems: Object.freeze({
${rows(gems, '        ')}
    }),
    meta: Object.freeze({
${rows(meta, '        ')}
    }),
    motions: Object.freeze({
${rows(motions, '        ')}
    }),
    bless: Object.freeze({
        spin: ${blessSpin},
        floors: Object.freeze(${q(blessFloors)}),
        colours: Object.freeze(${q(blessColours)}),
        runes: Object.freeze(${q(blessRunes)})
    }),
    atlas: Object.freeze({
${rows(atlas, '        ')}
    })
});
safeExposeData({ STAGE_SKILL_VFX });
`;
fs.writeFileSync(path.join(root, 'data/stage-skill-vfx.js'), text);
if (commentedClips.length) console.log(`주석 안에서 살린 클립: ${commentedClips.join(', ')}`);
console.log(`클립 ${Object.keys(clips).length}개(원본 ${Object.keys(atlas).length}개), 룬 ${Object.keys(gems).length}종, 동작 ${Object.keys(motions).length}종, 그림 ${files.length}장 ${megabytes.toFixed(1)}MB, 판 ${version}`);
