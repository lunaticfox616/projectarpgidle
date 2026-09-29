#!/usr/bin/env node
/* 직업 × 무기 36조합(Hana +6) 시트를 인계 시뮬레이터에서 꺼내 게임 자산으로 만든다.
 *
 *   node scripts/import-hana-weapon-combos.cjs <리그닌_젬_시전_시뮬레이터.html>
 *
 * 시뮬레이터 HTML에는 6직업 × 6무기(대검·곡도·단궁·오브·플라스크·향로) 조합 시트가 레이어째 들어 있다
 * (인계서 "교차 무기 — 36조합 모두 생성됨(시뮬레이터 안)"). 이 명령은 그것을
 *   assets/playable/hana/combos/<직업 id>/<무기 slug>.png
 * 로 쓰고, 규격(프레임 ms·타격 프레임·손 좌표·레이어 배치)과 젬 → 무기 대응을 data/hana-weapon-combos.js 로 옮긴다.
 *
 * 시트 배치: 칸은 79×79 캐릭터 칸에서 crop[x0,y0,w,h]만 잘라 둔 것. 열 = 레이어(무기_뒤·베이스·무기_앞·
 * 빈손_뒤·빈손_앞) × 10프레임, 행 = 모션(대기·달리기·공격·피격) × 방향(옆·아래·위). 왼쪽은 옆을 좌우 반전.
 * 젬 → 무기: 시뮬레이터의 "젬에 맞춰 자동" 분류(MOTION_CAT·CATS, docs/skill-assets-hana/reference/ui_player.js.txt).
 * 원본 라이선스(Hana Caraka): 게임 안 사용·수정만 가능, 재배포 금지. 이 저장소 밖으로 내보내지 않는다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const JOBS = { 전사: 'warrior', 방랑자: 'wanderer', 궁수: 'archer', 비술사: 'occultist', 연금술사: 'alchemist', 성직자: 'cleric' };
const WEAPONS = { 대검: 'greatsword', 곡도: 'scimitar', 단궁: 'shortbow', 오브: 'orb', 플라스크: 'flask', 향로: 'censer' };
// Weapons whose motion fits each gem category, preferred first. A class keeps its own weapon when it fits
// (a wanderer slashes with the scimitar, a cleric casts with the censer); otherwise the first one is drawn.
const CATEGORY_WEAPONS = {
    melee: ['대검', '곡도'], slam: ['대검', '곡도'], spin: ['대검', '곡도'], move: ['곡도', '대검'],
    shoot: ['단궁'], flask: ['플라스크'], censer: ['향로'],
    spell: ['오브', '향로'], channel: ['오브', '향로'], lance: ['오브', '향로'], summon: ['오브', '향로'],
    spear: ['오브', '향로'], throw: ['오브', '향로']
};

function fail(message) { console.error(message); process.exit(1); }
/** A JSON object literal assigned as `NAME=` inside the page, taken by brace matching. */
function grabObject(source, name) {
    const at = source.indexOf(name + '=');
    if (at < 0) fail(`시뮬레이터에 ${name}이 없습니다.`);
    let depth = 0, end = at + name.length + 1;
    const start = end;
    for (; end < source.length; end++) {
        const ch = source[end];
        if (ch === '{') depth++;
        else if (ch === '}' && --depth === 0) { end++; break; }
    }
    return JSON.parse(source.slice(start, end));
}
function motionCategories() {
    const text = fs.readFileSync(path.join(root, 'docs/skill-assets-hana/reference/ui_player.js.txt'), 'utf8');
    const match = text.match(/const MOTION_CAT=(\{[^}]*\})/);
    if (!match) fail('ui_player.js.txt에서 MOTION_CAT을 찾지 못했습니다.');
    return Function(`return ${match[1]}`)();
}
function slug(weapon) { return WEAPONS[weapon] || fail(`모르는 무기: ${weapon}`); }
function points(value) {
    if (Array.isArray(value)) return value.map(points);
    return typeof value === 'number' ? Math.round(value * 10) / 10 : value;
}
function motionSpec(spec) {
    const out = { ms: spec.dur, hand: points(spec.hand || {}) };
    if (spec.censer && Object.keys(spec.censer).length) out.censer = points(spec.censer);
    return out;
}
function writeSheets(meta, sheets) {
    const combos = {};
    for (const [job, classId] of Object.entries(JOBS)) {
        for (const weapon of meta.weapons) {
            const key = `${meta.jobs.indexOf(job)}_${meta.weapons.indexOf(weapon)}`, data = sheets[key], spec = meta.combos[`${job}|${weapon}`];
            if (!data || !spec) fail(`${job} × ${weapon} 조합이 시뮬레이터에 없습니다.`);
            const file = `assets/playable/hana/combos/${classId}/${slug(weapon)}.png`;
            fs.mkdirSync(path.join(root, path.dirname(file)), { recursive: true });
            fs.writeFileSync(path.join(root, file), Buffer.from(data.split(',')[1], 'base64'));
            combos[`${classId}|${slug(weapon)}`] = Object.fromEntries(meta.motions.map(motion => [motion, motionSpec(spec[motion])]));
        }
    }
    return combos;
}
function gemWeapons(meta) {
    const categories = Object.fromEntries(Object.entries(CATEGORY_WEAPONS).map(([cat, list]) => [cat, list.map(slug)]));
    return { byGemId: motionCategories(), categories };
}
function main() {
    const htmlPath = process.argv[2];
    if (!htmlPath || !fs.existsSync(htmlPath)) fail('사용법: node scripts/import-hana-weapon-combos.cjs <리그닌_젬_시전_시뮬레이터.html>');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const meta = grabObject(html, 'HANA_META'), sheets = grabObject(html, 'HANA_SHEETS');
    const combos = writeSheets(meta, sheets);
    const out = {
        source: path.basename(htmlPath), crop: meta.crop, cell: meta.cell, feetY: meta.feetY, centerX: meta.centerX,
        maxFrames: meta.maxFrames, motions: meta.motions, dirs: meta.dirs, layers: meta.layers,
        weapons: Object.fromEntries(meta.weapons.map(weapon => [slug(weapon), { label: weapon, hitFrame: meta.hit[weapon] }])),
        classWeapons: Object.fromEntries(Object.entries(meta.default).map(([job, weapon]) => [JOBS[job], slug(weapon)])),
        gems: gemWeapons(meta), combos
    };
    // One line per top-level field and per combo keeps the file diffable without one number per line.
    const fields = Object.entries(out).filter(([key]) => key !== 'combos').map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`);
    const comboLines = Object.entries(combos).map(([key, value]) => `        ${JSON.stringify(key)}: ${JSON.stringify(value)}`);
    const json = `{\n${fields.join(',\n')},\n    "combos": {\n${comboLines.join(',\n')}\n    }\n}`;
    const body = `// Generated by scripts/import-hana-weapon-combos.cjs — class × weapon Hana sheets (6 × 6) and the gem → weapon fit.\n`
        + `// Hana Caraka license: in-game use only, never redistribute.\n`
        + `const HANA_WEAPON_COMBOS = Object.freeze(${json});\nsafeExposeData({ HANA_WEAPON_COMBOS });\n`;
    fs.writeFileSync(path.join(root, 'data/hana-weapon-combos.js'), body);
    console.log(`조합 ${Object.keys(combos).length}개 시트와 data/hana-weapon-combos.js 를 썼습니다.`);
}
main();
