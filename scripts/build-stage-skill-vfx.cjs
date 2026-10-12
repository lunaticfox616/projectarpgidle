#!/usr/bin/env node
/* 스킬 이펙트 묶음(2026-10-13 사용자가 준 "스킬젬 리메이크 인계": 구매 팩에서 고른 이펙트 그림 한 장과 젬마다의 연결표)을 게임이
 * 읽는 모양으로 옮긴다(docs/stage-view-20261011.md).
 *
 *   node scripts/build-stage-skill-vfx.cjs <인계 폴더> [복사해 둘 폴더]
 *
 * <인계 폴더>는 00_먼저_읽기_인계서.md가 있는 폴더다. 여기서
 *   2_시뮬레이터/vfx/vfx.json, vfx.png      이펙트 그림 한 장과 그 칸의 자리
 *   2_시뮬레이터/src/gem_template.html      색 램프(RAMP), 클립(CLIPS), 무기 휘두름의 기본 클립(SWING_CLIP), 젬마다의 연결(VFXMAP)
 *   젬_목록.json                            젬의 계열과 동작 슬롯(시전 마법진을 띄울 젬, 근접 타격을 쓰는 젬)
 * 을 읽어
 *   그림: assets/stage-vfx/vfx.png (저장소에 넣지 않는다. 구매 팩에서 온 그림이라 다시 나눠 주면 안 된다). [복사해 둘 폴더]에도 둔다.
 *   표: data/stage-skill-vfx.js (수치와 이름만 있다).
 * 인계 폴더의 스크립트는 실행하지 않는다. 표는 글자로 읽어 풀고(값, 배열, 묶음만 받아들인다), 쓰이는 클립의 칸만 옮긴다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

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
/** `const 이름 = { … };` 의 묶음 글: 여는 괄호부터 줄 머리의 닫는 괄호까지(한 줄짜리는 그 줄 끝까지). */
function tableText(name) {
    const start = template.indexOf(`const ${name} = {`);
    if (start < 0) throw new Error('표가 없다: ' + name);
    const open = template.indexOf('{', start), lineEnd = template.indexOf('\n', open);
    const oneLine = template.slice(open, lineEnd).trimEnd();
    if (oneLine.endsWith('};')) return oneLine.slice(0, -1);
    const close = template.indexOf('\n};', open);
    return template.slice(open, close + 2);
}
const table = name => readLiteral(tableText(name));

const ramps = table('RAMP'), clips = table('CLIPS'), swingClips = table('SWING_CLIP'), gems = table('VFXMAP'), elementRamp = table('EL_RAMP');
// 속성의 세 색(코드로 그리는 연출이 쓴다): 이름은 빼고 색만 옮긴다.
const elements = Object.fromEntries(Object.entries(table('EL')).map(([key, row]) => [key, { c1: row.c1, c2: row.c2, c3: row.c3 }]));
const atlasAll = JSON.parse(fs.readFileSync(path.join(sim, 'vfx/vfx.json'), 'utf8'));
const gemList = Object.values(JSON.parse(fs.readFileSync(path.join(from, '젬_목록.json'), 'utf8')));

// ---------------------------------------------------------------- what the game needs
const used = new Set(Object.values(clips).map(clip => clip.a));
const atlas = {};
for (const name of [...used].sort()) {
    const row = atlasAll[name];
    if (!row) throw new Error('그림에 없는 클립 원본: ' + name);
    atlas[name] = { w: row.w, h: row.h, n: row.n, p: row.p.map(value => Math.round(value * 10) / 10), fx: row.fx, fb: row.fb };
}
// 연결표가 가리키는 클립이 모두 있는지 본다.
const refsOf = value => (typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(refsOf) : value && typeof value === 'object' ? Object.values(value).flatMap(refsOf) : []);
const SPECIAL = new Set(['none', 'pierce', 'rune', 'clock', 'judgment']);
for (const [id, map] of Object.entries(gems)) for (const [hook, value] of Object.entries(map)) {
    if (hook === 'ramp' || hook === 'chop' || hook === 'old') continue;
    for (const ref of refsOf(value)) if (!SPECIAL.has(ref) && !clips[ref.split('@')[0]]) throw new Error(`젬 ${id}의 ${hook}: 없는 클립 ${ref}`);
}
/** 젬의 갈래: cast 시전 마법진을 띄운다(주문, 위습, 시전과 집중 슬롯), melee 근접 타격 모양을 쓴다(인계의 kind가 strike, whirl, move). */
const meta = {};
for (const gem of gemList) meta[gem.id] = { name: gem.n, el: gem.el, cast: /시전|집중/.test(gem.slot) || gem.fam === 'spell' || gem.fam === 'wisp', melee: ['strike', 'whirl', 'move'].includes(gem.kind), kind: gem.kind };

const picture = fs.readFileSync(path.join(sim, 'vfx/vfx.png'));
for (const out of [path.join(root, 'assets/stage-vfx'), ...(mirror ? [mirror] : [])]) {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'vfx.png'), picture);
}
const version = crypto.createHash('sha1').update(picture).digest('hex').slice(0, 10);

// ---------------------------------------------------------------- the table file
const q = value => JSON.stringify(value).replace(/"([A-Za-z_$][\w$]*)":/g, '$1:').replace(/"/g, '\'');
const rows = (object, indent) => Object.entries(object).map(([key, value]) => `${indent}${/^[A-Za-z_$][\w$]*$/.test(key) ? key : `'${key}'`}: ${q(value)}`).join(',\n');
const text = `// 스킬 이펙트 묶음 (js/canvas-stage-skill-vfx.js). scripts/build-stage-skill-vfx.cjs가 만든 표다: 손으로 고치지 않는다.
// 2026-10-13 사용자가 준 "스킬젬 리메이크 인계"에서 이펙트만 옮겼다: 구매 팩에서 고른 이펙트 그림 한 장(assets/stage-vfx/vfx.png,
// 저장소에 넣지 않는다)과 젬마다 어느 클립을 어느 때 쓰는지. 젬의 판정, 무기 조건, 수치는 옮기지 않았다(게임의 것 그대로).
//   ramps   색 램프: 어두운 쪽에서 밝은 쪽으로 여섯 단계. 클립을 '이름@램프'로 부르면 그림의 밝기를 이 여섯 색으로 다시 칠한다('@='는 원래 색).
//   elementRamp 속성 → 램프. 젬이 램프를 정하지 않은 클립은 젬의 속성 색으로 칠한다.
//   elements 속성의 세 색(c1 밝은색, c2 중간색, c3 어두운색): 코드로 그리는 연출(마법진, 바늘, 창과 독니)이 쓴다.
//   atlas   클립 원본: w, h 한 칸의 크기, n 칸 수, p 밝기의 범위(다시 칠할 때의 기준), fx 칸마다의 자리, fb 칸마다 그림이 차지하는 상자.
//   clips   클립: a 원본, f 쓰는 칸의 처음과 끝, an 기준점(center 가운데, bottom 바닥, left 왼쪽, right 오른쪽), sc 배율, ms 한 칸의 시간,
//           loop 반복, one 넓은 범위에도 하나만, few 고리에 적게, small 타격 효과로 쓸 때 줄이지 않음, next 이어지는 클립, flat 바닥에 눕히는 비율.
//   swingClips 무기 휘두름의 기본 클립(젬이 휘두름을 정하지 않았을 때).
//   gems    젬 번호(data/skill-fx-atlas.js의 id) → 훅: 클립. swing 휘두름, chop 내려찍기, impact 내려찍은 자리, hit 맞은 적, area 범위,
//           after 여진, wave 나아가는 파동, zap 연쇄 번개, fall 낙하, tick 지속 타격, muzzle 발사 섬광, blast 착탄 … (인계의 02_이펙트_연결표.md).
//   meta    젬 번호 → 인계의 젬 갈래: el 속성, cast 시전 마법진을 띄우는 젬, melee 근접 타격 모양을 쓰는 젬, kind 인계의 판정 갈래.
const STAGE_SKILL_VFX = Object.freeze({
    path: 'assets/stage-vfx/',
    file: 'vfx.png',
    version: '${version}',
    ramps: Object.freeze({
${rows(ramps, '        ')}
    }),
    elementRamp: Object.freeze(${q(elementRamp)}),
    elements: Object.freeze({
${rows(elements, '        ')}
    }),
    swingClips: Object.freeze(${q(swingClips)}),
    clips: Object.freeze({
${rows(clips, '        ')}
    }),
    gems: Object.freeze({
${rows(gems, '        ')}
    }),
    meta: Object.freeze({
${rows(meta, '        ')}
    }),
    atlas: Object.freeze({
${rows(atlas, '        ')}
    })
});
safeExposeData({ STAGE_SKILL_VFX });
`;
fs.writeFileSync(path.join(root, 'data/stage-skill-vfx.js'), text);
console.log(`클립 ${Object.keys(clips).length}개(원본 ${Object.keys(atlas).length}개), 젬 ${Object.keys(gems).length}종, 그림 ${(picture.length / 1048576).toFixed(1)}MB, 판 ${version}`);
