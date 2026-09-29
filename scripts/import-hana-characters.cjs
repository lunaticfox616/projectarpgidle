#!/usr/bin/env node
/* Hana +6 캐릭터 인계 결과물을 게임 자산으로 가져온다.
 *
 *   node scripts/import-hana-characters.cjs <인계 폴더>
 *
 * <인계 폴더>는 `리그닌_캐릭터_스킬_인계_*` 압축을 푼 폴더(또는 그 안의 `1_캐릭터_에셋킷`)다.
 * 킷에서 캐릭터를 다시 뽑았다면 이 명령을 다시 실행하면 된다.
 *
 * - 직업별 합성 시트(무기_뒤 + 베이스 + 무기_앞)를 assets/playable/hana/<직업 id>/<모션>.png 로 복사한다.
 *   시트: 칸 79×79, 행 = 하·좌·우·상, 열 = 프레임.
 * - 규격 JSON(프레임 ms·타격 프레임·표시 영역·발사점·몸이동)을 data/hana-sprites.js 로 옮긴다.
 * - 위습 정령 소환수(3_결과물/Hana_소환수/위습정령, 스킬 변경분 2부터)를 assets/summon/wisp/<slug>_<idle|attack>.png 로 복사한다.
 *   시트 규격(16×16 네 칸, 프레임 ms, 타격 프레임)이 data/wisp-summons.js 표와 다르면 멈춘다(표를 먼저 고친다).
 *   젬 아이콘(assets/gems/active/summon-wisp-*-v1.png)은 대기 첫 프레임을 2배로 키운 그림이라 여기서 만들지 않는다.
 * 원본 라이선스(Hana Caraka): 게임 안 사용·수정은 가능, 원본 팩·결과물 재배포 금지. 이 저장소 밖으로 내보내지 않는다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const JOBS = [
    ['전사', 'warrior'], ['방랑자', 'wanderer'], ['궁수', 'archer'],
    ['비술사', 'occultist'], ['연금술사', 'alchemist'], ['성직자', 'cleric']
];
const MOTIONS = [['대기', 'idle'], ['걷기', 'walk'], ['달리기', 'run'], ['피격', 'hurt'], ['공격', 'attack']];
const WEAPONS = { 대검: 'greatsword', 곡도: 'scimitar', 단궁: 'shortbow', 오브: 'orb', 플라스크: 'flask', 향로: 'censer' };
const ROWS = { 하: 'down', 좌: 'left', 우: 'right', 상: 'up' };

function fail(message) { console.error(message); process.exit(1); }
function pngSize(file) {
    const bytes = fs.readFileSync(file);
    if (bytes.readUInt32BE(12) !== 0x49484452) fail(`PNG가 아닙니다: ${file}`);
    return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
}
function findDir(start, name) {
    const direct = path.join(start, name);
    if (fs.existsSync(direct)) return direct;
    for (const entry of fs.readdirSync(start, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const nested = path.join(start, entry.name, name);
        if (fs.existsSync(nested)) return nested;
    }
    return null;
}
function copy(from, to) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
}
function roundPoints(value) {
    if (Array.isArray(value)) return value.map(roundPoints);
    return typeof value === 'number' ? Math.round(value * 10) / 10 : value;
}
function mapDirs(byDir) {
    let out = {};
    for (const [ko, points] of Object.entries(byDir || {})) out[ROWS[ko] || ko] = roundPoints(points);
    return out;
}
/** The game's wisp table (data/wisp-summons.js): slugs and the sheet timing the handoff spec must match. */
function wispTable() {
    const context = {};
    context.safeExposeData = data => Object.assign(context, data);
    vm.runInNewContext(fs.readFileSync(path.join(root, 'data/wisp-summons.js'), 'utf8'), context);
    return { slugs: Object.values(context.WISP_SUMMONS).map(row => row.slug), sheet: context.WISP_SUMMON_SHEET };
}
function checkWispSpec(spec, sheet) {
    const timing = spec['타이밍_ms'] || {};
    const same = spec['크기'].join() === [sheet.size, sheet.size].join() && sheet.idleMs.every(ms => ms === timing.idle)
        && timing.attack.join() === sheet.attackMs.join() && timing.strike === sheet.strike;
    if (!same) fail('위습 시트 규격이 data/wisp-summons.js 표와 다릅니다 — 표(WISP_SUMMON_SHEET)를 먼저 고친다');
}
/** Copies the wisp summon sheets when the handoff has them; returns how many wisps it brought. */
function importWisps(handoff) {
    const dir = path.join(handoff, '3_결과물', 'Hana_소환수', '위습정령');
    if (!fs.existsSync(dir)) return 0;
    const spec = JSON.parse(fs.readFileSync(path.join(dir, '위습정령_규격.json'), 'utf8')), table = wispTable();
    checkWispSpec(spec, table.sheet);
    for (const slug of table.slugs) {
        const row = spec['위습'][slug];
        if (!row) fail(`위습 규격에 ${slug}가 없습니다`);
        for (const [ko, motion] of [['대기', 'idle'], ['공격', 'attack']]) {
            const file = path.join(dir, row[ko]), size = pngSize(file);
            if (size.w !== table.sheet.size * 4 || size.h !== table.sheet.size) fail(`${file}: ${table.sheet.size}×${table.sheet.size} 네 칸이 아닙니다`);
            copy(file, path.join(root, table.sheet.path, `${slug}_${motion}.png`));
        }
    }
    return table.slugs.length;
}

const input = process.argv[2];
if (!input) fail('사용법: node scripts/import-hana-characters.cjs <인계 폴더>');
const base = path.resolve(input);
const kit = fs.existsSync(path.join(base, '결과물')) ? base : findDir(base, '1_캐릭터_에셋킷');
if (!kit) fail(`1_캐릭터_에셋킷 폴더를 찾지 못했습니다: ${base}`);
const jobsDir = path.join(kit, '결과물', 'Hana_직업');
if (!fs.existsSync(jobsDir)) fail(`결과물/Hana_직업이 없습니다: ${jobsDir}`);

const classes = {};
let cell = null;
for (const [ko, id] of JOBS) {
    const dir = path.join(jobsDir, ko);
    const spec = JSON.parse(fs.readFileSync(path.join(dir, `${ko}_규격.json`), 'utf8'));
    const [cw, ch] = spec['셀'];
    if (cell && (cell[0] !== cw || cell[1] !== ch)) fail(`${ko}: 칸 크기가 다릅니다`);
    cell = [cw, ch];
    const rows = spec['행'].map(row => ROWS[row]);
    if (rows.join() !== 'down,left,right,up') fail(`${ko}: 행 순서가 예상과 다릅니다(${spec['행']})`);
    const motions = {};
    for (const [motionKo, motion] of MOTIONS) {
        const m = spec['모션'][motionKo];
        if (!m) fail(`${ko}: ${motionKo} 모션 규격이 없습니다`);
        const sheet = path.join(dir, `${ko}_${motionKo}_합성.png`);
        const size = pngSize(sheet);
        if (size.w !== cw * m['프레임수'] || size.h !== ch * 4) fail(`${ko} ${motionKo}: 시트 크기 ${size.w}x${size.h}가 규격과 다릅니다`);
        copy(sheet, path.join(root, 'assets/playable/hana', id, `${motion}.png`));
        let entry = { frames: m['프레임수'], ms: m['프레임ms'], bounds: m['표시영역'] && m['표시영역']['범위'] };
        if (Number.isInteger(m['타격프레임'])) entry.hitFrame = m['타격프레임'];
        if (m['발사점']) entry.launch = mapDirs(m['발사점']['값'] || m['발사점']);
        if (m['몸이동']) entry.bodyShift = mapDirs(m['몸이동']['값']);
        motions[motion] = entry;
    }
    let projectile = null;
    const arrow = path.join(dir, `${ko}_화살.png`);
    if (fs.existsSync(arrow)) {
        const size = pngSize(arrow);
        copy(arrow, path.join(root, 'assets/playable/hana', id, 'arrow.png'));
        projectile = { asset: `assets/playable/hana/${id}/arrow.png`, cell: [size.h, size.h], rows };
    }
    classes[id] = {
        label: ko,
        weapon: WEAPONS[spec['무기']] || spec['무기'],
        weaponLabel: spec['무기'],
        motions,
        ...(projectile ? { projectile } : {})
    };
}

const wisps = importWisps(base);

const data = {
    version: 1,
    source: path.basename(base),
    cell: { w: cell[0], h: cell[1] },
    feetY: 39,
    rows: ['down', 'left', 'right', 'up'],
    pixelScale: 3,
    classes
};
// 숫자 배열은 한 줄로 접어 읽기 쉽게 둔다.
const json = JSON.stringify(data, null, 2)
    .replace(/\[\s+(-?\d+(?:\.\d+)?(?:,\s+-?\d+(?:\.\d+)?)*)\s+\]/g, (_, body) => `[${body.replace(/\s+/g, '')}]`)
    .replace(/\[\s+((?:\[[^\[\]]*\],?\s*)+)\]/g, (_, body) => `[${body.replace(/\s+/g, '')}]`);
const text = `// 자동 생성: node scripts/import-hana-characters.cjs <인계 폴더>. 직접 고치지 말고 킷에서 다시 뽑은 뒤 가져온다.
// Hana +6 캐릭터(키 21px, 칸 ${cell[0]}×${cell[1]}, 발 y=39, 행 = 하·좌·우·상). 화면에는 정수 ×3, 보간 없이 그린다.
const HANA_SPRITES = Object.freeze(${json});
safeExposeData({ HANA_SPRITES });
`;
fs.writeFileSync(path.join(root, 'data/hana-sprites.js'), text);
console.log(`직업 ${Object.keys(classes).length}종 → data/hana-sprites.js, 위습 정령 ${wisps}종 → assets/summon/wisp/`);
