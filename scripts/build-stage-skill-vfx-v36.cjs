#!/usr/bin/env node
/* 스킬 전체 디렉터 전달본 V3.6(2026-11-01)의 그림과 표를 옮긴다(docs/stage-view-20261011.md). 룬 74종의 이펙트 연결, 새 룬 넷의 동작, 분광 위습 삭제,
 * 연출 보강(준비, 놓음, 마무리)의 표, 향로 머리 자리, 소환 위습 다섯의 그림까지 전부다. 사용자가 전에 정한 한손검 투사체 룬의 던지기 동작은 그대로 둔다.
 *
 *   node scripts/build-stage-skill-vfx-v36.cjs <전달본 폴더>
 *
 * 그림: assets/stage-vfx/vfx3.png. 구매 팩에서 온 그림이라 저장소에 넣지 않는다(.gitignore, scripts/lib/private-paths.js). 전달본의 vfx3, vfx4 아틀라스에서 쓰는
 *   칸만 잘라 오고, 원래 색 그대로 그리는 띠(Fire Mage, Warlock, Buff n Debuff, 사선 칼날)를 한 장에 늘어놓는다. 픽셀은 바이트 그대로 옮긴다.
 *   소환 위습 그림(assets/stage-vfx/wisps/)은 구매 그림이 아니라 저장소에 넣는다.
 * 표: data/stage-skill-vfx.js에 덧붙인다(같은 일을 다시 해도 결과가 같다). scripts/build-stage-skill-vfx.cjs로 표를 다시 뽑으면 이 스크립트도 뒤이어 돌린다.
 * 전달본의 코드는 실행하지 않는다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { CLASS_IDS, STANCE_IDS, MOTION_IDS, idOf } = require('./lib/stage-motion-ids.cjs');

const root = path.join(__dirname, '..');
const from = process.argv[2];
if (!from) { console.error('쓰는 법: node scripts/build-stage-skill-vfx-v36.cjs <전달본 폴더>'); process.exit(1); }
const sim = path.join(from, '시뮬레이터');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(from, rel), 'utf8'));

// ---------------------------------------------------------------- png
/** 8비트 RGBA, 비월 없는 PNG만 받는다(전달본의 시트가 모두 그렇다). */
function readPng(file) {
    const data = fs.readFileSync(file), width = data.readUInt32BE(16), height = data.readUInt32BE(20);
    if (data[24] !== 8 || data[25] !== 6 || data[28] !== 0) throw new Error('8비트 RGBA PNG가 아니다: ' + file);
    const chunks = [];
    for (let at = 8; at < data.length;) {
        const size = data.readUInt32BE(at);
        if (data.toString('latin1', at + 4, at + 8) === 'IDAT') chunks.push(data.subarray(at + 8, at + 8 + size));
        at += 12 + size;
    }
    const raw = zlib.inflateSync(Buffer.concat(chunks)), stride = width * 4, pixels = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y++) unfilterRow(raw, pixels, y, stride);
    return { width, height, pixels };
}
function unfilterRow(raw, out, y, stride) {
    const type = raw[y * (stride + 1)], source = y * (stride + 1) + 1, target = y * stride;
    for (let i = 0; i < stride; i++) {
        const left = i >= 4 ? out[target + i - 4] : 0, up = y ? out[target + i - stride] : 0, corner = y && i >= 4 ? out[target + i - stride - 4] : 0;
        out[target + i] = (raw[source + i] + filterGuess(type, left, up, corner)) & 255;
    }
}
function filterGuess(type, left, up, corner) {
    if (type === 1) return left;
    if (type === 2) return up;
    if (type === 3) return (left + up) >> 1;
    if (type !== 4) return 0;
    const p = left + up - corner, a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - corner);
    return a <= b && a <= c ? left : b <= c ? up : corner;
}
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buffer) { let c = 0xffffffff; for (const byte of buffer) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function pngChunk(name, body) {
    const head = Buffer.alloc(4), type = Buffer.from(name, 'latin1'), tail = Buffer.alloc(4);
    head.writeUInt32BE(body.length);
    tail.writeUInt32BE(crc32(Buffer.concat([type, body])));
    return Buffer.concat([head, type, body, tail]);
}
function writePng(file, width, height, pixels) {
    const ihdr = Buffer.alloc(13), stride = width * 4, raw = Buffer.alloc((stride + 1) * height);
    ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
    for (let y = 0; y < height; y++) pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))]));
}
function blit(target, source, box, x, y) {
    for (let row = 0; row < box.h; row++) source.pixels.copy(target.pixels, (y + row) * target.width * 4 + x * 4, (box.y + row) * source.width * 4 + box.x * 4, (box.y + row) * source.width * 4 + (box.x + box.w) * 4);
}

// ---------------------------------------------------------------- what the package changes
const packageSkills = readJson('데이터/skills.json');
const packageClips = readJson('에셋/runtime-clip-bindings.json').clips;
/** 룬 번호 → 전달본의 연결(데이터/skills.json vfx)에 게임의 연출이 읽는 이름을 더한 것. 코드로 그리는 연출이 맡는 룬은 그 표시를 둔다. */
const GEM_OVERRIDES = {
    // 시간의 사선은 타격 클립 없이 코드로 그린 충돌이 맡는다. 정화의 집행의 향로 머리와 불똥은 원래 색 띠로 그린다(canvas-stage-new-runes.js)
    80: () => ({ swing: 'none', hit: 'none' }),
    81: () => ({ swing: 'none', censer: { ember: 'q_ember@fire', ground: 'q_fireground@fire' }, hit: 'q_firehit@fire' }),
    // 유성 낙화: 폭발은 원래 색 띠가 맡는다(meteor-impact-tuning). 심연 전염과 암흑 파열: Warlock 띠가 맡는다(warlock-vfx-remake)
    34: map => { const { area, ...rest } = map; return { ...rest, meteor: true }; },
    23: () => ({ hit: 'none', warlock: 'infection' }),
    27: () => ({ hit: 'none', warlock: 'rupture' }),
    // 향로구름: 도착 자리의 아홉 겹 안개(censer-cloud-burst). 폭발성 타격: 고리와 불 핵을 한 자리에서(explosive-finish)
    55: map => ({ ...map, cloud: true }),
    67: map => ({ ...map, after: 'expl67_ring@fire', afterCore: 'expl67_core@=', afterHeight: 34 }),
    // 신성한 안개, 파문심판, 시간 가속은 전용 연출이 맡는다(holy-mist-remake, judgment-slam, time-acceleration-vfx)
    50: map => ({ ...map, holyMist: true, sweep: 'hm31_sweep@holy', plume: 'hm31_plume@hm31_soft', vent: 'hm31_vent@hm31_soft' }),
    51: map => ({ ...map, slam: { dust: 'judg51_dust@stone', ring: 'judg51_ring@light', wave: 'judg51_wave@light', bolt: 'judg51_bolt@light', core: 'judg51_core@light', impact: 'judg51_impact@light' } }),
    // 얼어붙은 고리, 과냉각 혼합물(ice-vfx-tuning): 고리는 조용히, 맞은 적의 타격도 조금 줄인다
    72: map => ({ ...map, iceWave: 'ice72_wave@=', iceShard: 'ice72_shard@=' }),
    48: map => ({ ...map, quietRing: 'ice48_ring@=', hitLook: { alpha: 0.72, scale: 0.86 } }),
    // 부싯돌 베기(flint-slash-tuning): 도는 불길 대신 뜨거운 초승달과 불꼬리, 휘두름과 타격을 조금 크게
    66: map => ({ ...map, flintBlade: 'flint66_blade@fire', flintTail: 'flint66_tail@fire', swingScale: 1.18, hitLook: { alpha: 0.98, most: 88 } })
};
const gemOf = row => (GEM_OVERRIDES[row.id] ? GEM_OVERRIDES[row.id](row.vfx || {}) : row.vfx || {});
const GEMS = Object.fromEntries(packageSkills.filter(row => row.active !== false).map(row => [row.id, gemOf(row)]));
/** 코드가 이름으로 부르는 클립(전달본의 곁다리 연출이 스스로 정의한 것). 보강 연출이 쓰는 것까지. */
const SIDE_CLIPS = { ...readJson('시뮬레이터/censer-cloud-burst-config.json').clips, ...readJson('시뮬레이터/holy-mist-remake-config.json').clips, ...readJson('시뮬레이터/judgment-slam-config.json').clips,
    ...readJson('시뮬레이터/ice-vfx-config.json').clips, ...readJson('시뮬레이터/explosive-finish-config.json').clips, ...readJson('시뮬레이터/flint-slash-config.json').clips, ...readJson('시뮬레이터/vfx-polish-config.json').aliases };
/** 연결표가 부르는 이름(값 안의 표와 목록까지). */
function namesIn(value, out = new Set()) {
    if (typeof value === 'string') { const name = value.split('@')[0]; if (packageClips[name] || SIDE_CLIPS[name]) out.add(name); }
    else if (value && typeof value === 'object') Object.values(value).forEach(item => namesIn(item, out));
    return out;
}
const USED_CLIPS = namesIn(GEMS);
Object.keys(SIDE_CLIPS).forEach(name => USED_CLIPS.add(name));
/** 코드로 그리는 연출이 곧바로 트는 클립: 그 룬을 끼면 띠를 미리 만들어 두게 연결표에 적는다(js/canvas-stage-skill-rules.js ruleClipNames). */
const KEEP = { 55: ['cc55_core@phys', 'cc55_sidepuff@phys', 'cc55_cloud@phys', 'cc55_front@phys', 'cc55_arc@phys'] };
/** 룬마다 보강의 갈래(vfx-polish-config profiles). */
const POLISH = Object.fromEntries(readJson('시뮬레이터/vfx-polish-config.json').profiles.filter(row => GEMS[row.id]).map(row => [row.id, row.heavy ? [row.mode, 1] : [row.mode]]));
const META = {
    78: { name: '추적 사격', el: 'phys', cast: false, melee: false, kind: 'proj' },
    79: { name: '석화 혼합물', el: 'phys', cast: false, melee: false, kind: 'point' },
    80: { name: '시간의 사선', el: 'phys', cast: false, melee: false, kind: 'proj' },
    81: { name: '정화의 집행', el: 'fire', cast: false, melee: true, kind: 'whirl' }
};
const NEW_RUNES = Object.keys(META).map(Number);
/** 전달본이 지운 룬(skill-exclusions-v25.json): 표에서 뺀다. 그 룬을 가진 저장은 data/skills.js RETIRED_GEM_SUCCESSORS가 잇는다. */
const REMOVED = [116];
/** 원래 색 그대로 그리는 띠: 이름 → 전달본의 파일과 칸. */
const RAW = {
    fire3: { file: 'fire-mage81-assets/fire-mage-03.png', w: 128, h: 128, n: 12 },
    fire4: { file: 'fire-mage81-assets/fire-mage-04.png', w: 128, h: 128, n: 14 },
    fire8: { file: 'fire-mage81-assets/fire-mage-08.png', w: 128, h: 128, n: 4 },
    fire10: { file: 'fire-mage81-assets/fire-mage-10.png', w: 128, h: 128, n: 5 },
    fire1: { file: 'meteor-assets/fire-mage-01.png', w: 128, h: 128, n: 7 },
    fire6: { file: 'meteor-assets/fire-mage-06.png', w: 128, h: 128, n: 8 },
    wl3: { file: 'warlock-assets/warlock-03.png', w: 128, h: 128, n: 8 },
    wl7: { file: 'warlock-assets/warlock-07.png', w: 128, h: 128, n: 7 },
    wl9: { file: 'warlock-assets/warlock-09.png', w: 128, h: 128, n: 5 },
    wl10: { file: 'warlock-assets/warlock-10.png', w: 128, h: 128, n: 5 },
    clock: { file: 'time-buff-assets/buff-01.png', w: 48, h: 48, n: 26 },
    clock46: { file: 'time-buff-assets/buff-02.png', w: 48, h: 64, n: 19 },
    hourglass: { file: 'time-buff-assets/buff-05.png', w: 48, h: 48, n: 25 },
    blade: { file: 'time-slash-assets/effects/diagonal-blade.png', w: 64, h: 64, n: 1 }
};
/** 소환 위습의 그림(원소 → 파일). 구매 그림이 아니라 저장소에 넣는다. */
const WISPS = { fire: 'fire.png', cold: 'cold.png', light: 'light.png', phys: 'phys.png', chaos: 'chaos.png' };

const SHEET_WIDTH = 2048;
const shelf = { x: 0, y: 0, height: 0 };
/** 다음 칸의 자리: 줄 끝을 넘으면 다음 줄로. */
function place(w, h) {
    if (shelf.x + w > SHEET_WIDTH) { shelf.x = 0; shelf.y += shelf.height + 1; shelf.height = 0; }
    const spot = { x: shelf.x, y: shelf.y };
    shelf.x += w + 1;
    shelf.height = Math.max(shelf.height, h);
    return spot;
}

const items = Object.values(readJson('에셋/vfx-atlas-index.json').items);
const sourceSheets = ['vfx.png', 'vfx2.png', 'vfx3.png', 'vfx4.png'].map(name => ({ name, read: null }));
function sourceSheet(index) { return sourceSheets[index].read || (sourceSheets[index].read = readPng(path.join(sim, sourceSheets[index].name))); }

// 표부터 읽어 이미 있는 칸을 안다
const tableFile = path.join(root, 'data/stage-skill-vfx.js'), tableText = fs.readFileSync(tableFile, 'utf8');
const sandbox = { safeExposeData: data => Object.assign(sandbox, data) };
vm.runInNewContext(tableText, sandbox);
const old = JSON.parse(JSON.stringify(sandbox.STAGE_SKILL_VFX));

const clips = Object.fromEntries([...USED_CLIPS].map(name => {
    const row = SIDE_CLIPS[name] || packageClips[name];
    if (!row) throw new Error('전달본에 없는 클립: ' + name);
    return [name, row];
}));
/** 게임에 이미 있는 클립은 전달본의 끝 옅어짐(fadeOut)만 받는다. */
const refreshed = Object.fromEntries(Object.entries(old.clips).map(([name, row]) => [name, packageClips[name] && packageClips[name].fadeOut ? { ...row, fadeOut: packageClips[name].fadeOut } : row]));
const needed = [...new Set(Object.values(clips).map(clip => clip.a))].filter(name => !old.atlas[name] || old.atlas[name].im === 2);
const plan = needed.map(name => {
    const item = items.find(row => row.key === name);
    if (!item) throw new Error('전달본 아틀라스에 없다: ' + name);
    return { name, item, meta: item.sourceMetadata };
}).sort((a, b) => b.meta.h - a.meta.h);
const rawPlan = Object.entries(RAW).map(([name, row]) => ({ name, row, picture: readPng(path.join(sim, row.file)) })).sort((a, b) => b.row.h * b.row.n - a.row.h * a.row.n);

const atlasAdded = {}, rawTable = {}, copies = [];
for (const { name, row, picture } of rawPlan) {
    if (picture.width !== row.w * row.n || picture.height !== row.h) throw new Error('띠의 크기가 다르다: ' + row.file);
    const spot = place(picture.width, picture.height);
    rawTable[name] = { x: spot.x, y: spot.y, w: row.w, h: row.h, n: row.n };
    copies.push({ source: picture, box: { x: 0, y: 0, w: picture.width, h: picture.height }, ...spot });
}
for (const { name, item, meta } of plan) {
    const fx = meta.fx.map(([x, y]) => {
        const spot = place(meta.w, meta.h);
        copies.push({ source: sourceSheet(item.imageIndex), box: { x, y, w: meta.w, h: meta.h }, ...spot });
        return [spot.x, spot.y];
    });
    atlasAdded[name] = { w: meta.w, h: meta.h, n: meta.n, p: meta.p.map(value => Math.round(value * 10) / 10), fx, fb: meta.fb, im: 2 };
}
const sheet = { width: SHEET_WIDTH, height: shelf.y + shelf.height, pixels: null };
sheet.pixels = Buffer.alloc(sheet.width * sheet.height * 4);
for (const copy of copies) blit(sheet, copy.source, copy.box, copy.x, copy.y);
const pictureFile = path.join(root, 'assets/stage-vfx/vfx3.png');
writePng(pictureFile, sheet.width, sheet.height, sheet.pixels);

// ---------------------------------------------------------------- motions
/** 직업별 실제 동작(per-job-bindings): 시간의 사선은 정면 찌르기(effectiveOverride). */
function motionsOf(id) {
    const out = {};
    for (const row of readJson('데이터/per-job-bindings.json').rows.filter(entry => entry.id === id)) {
        const motion = idOf(MOTION_IDS, (row.effectiveOverride && row.effectiveOverride.motion) || row.sourceResolve.m, '동작 이름');
        (out[idOf(CLASS_IDS, row.job, '직업')] ??= {})[idOf(STANCE_IDS, row.weapon, '무기 자세')] = motion;
    }
    return out;
}

// ---------------------------------------------------------------- the table
/** 향로 회전 동작의 향로 머리 자리(holy-mist-geometry, 발 기준 도트, 오른쪽을 보는 그림): 직업 → 장마다 [x, y, 뒤쪽이면 1], 향로가 안 보이는 장은 null. */
function censerHeads() {
    const geometry = readJson('시뮬레이터/audit-censer-anchors-v31/native-censer-geometry.json').jobs, out = {};
    for (const [job, row] of Object.entries(geometry)) out[idOf(CLASS_IDS, job, '직업')] = row.frames.map(frame => (frame.headVisible === false || !frame.head ? null : [frame.head[0], frame.head[1], frame.depth === 'rear' ? 1 : 0]));
    return out;
}
const table = { ...old, clips: { ...refreshed, ...clips }, atlas: { ...old.atlas, ...atlasAdded }, raw: rawTable,
    gems: { ...old.gems }, meta: { ...old.meta }, motions: { ...old.motions }, ramps: { ...old.ramps, hm31_soft: readJson('시뮬레이터/holy-mist-remake-config.json').smokeRamp },
    polish: POLISH, censerHeads: censerHeads(), wisps: { path: 'assets/stage-vfx/wisps/', size: 32, frames: 4, ms: 120, files: WISPS },
    files: old.files.includes('vfx3.png') ? old.files : [...old.files, 'vfx3.png'] };
for (const [id, map] of Object.entries(GEMS)) table.gems[id] = KEEP[id] ? { ...map, keep: KEEP[id] } : map;
for (const id of NEW_RUNES) { table.meta[id] = META[id]; table.motions[id] = motionsOf(id); }
for (const id of REMOVED) { delete table.gems[id]; delete table.meta[id]; delete table.motions[id]; }
table.meta[55] = { ...table.meta[55], el: 'phys' };   // 향로구름은 이제 물리 피해를 준다
// 파문심판은 향로 강타 동작(judgment-slam), 암살은 뒤찌르기를 쓰지 않고 보통 공격(per-job-bindings). 다른 룬의 동작은 그대로다.
table.motions[51] = motionsOf(51);
table.motions[52] = motionsOf(52);
const wispFolder = path.join(root, table.wisps.path);
fs.mkdirSync(wispFolder, { recursive: true });
for (const file of Object.values(WISPS)) fs.copyFileSync(path.join(sim, 'wisps', file), path.join(wispFolder, file));
const hash = crypto.createHash('sha1');
for (const file of table.files) hash.update(fs.readFileSync(path.join(root, 'assets/stage-vfx', file)));
table.version = hash.digest('hex').slice(0, 10);

const q = value => JSON.stringify(value).replace(/"([A-Za-z_$][\w$]*)":/g, '$1:').replace(/"/g, '\'');
const rows = (object, indent) => Object.entries(object).map(([key, value]) => `${indent}${/^[A-Za-z_$][\w$]*$/.test(key) ? key : `'${key}'`}: ${q(value)}`).join(',\n');
const head = tableText.slice(0, tableText.indexOf('const STAGE_SKILL_VFX = Object.freeze({'));
const NOTE = '//   raw     원래 색 그대로 그리는 띠(전달본 V3.6, scripts/build-stage-skill-vfx-v36.cjs가 덧붙인다): x, y 그 장의 자리, w, h 한 칸, n 칸 수. files의 셋째 장(vfx3.png)에 있다.\n';
const text = `${head.includes('//   raw ') ? head : head + NOTE}const STAGE_SKILL_VFX = Object.freeze({
    path: 'assets/stage-vfx/',
    files: Object.freeze(${q(table.files)}),
    version: '${table.version}',
    ramps: Object.freeze({
${rows(table.ramps, '        ')}
    }),
    elementRamp: Object.freeze(${q(table.elementRamp)}),
    elements: Object.freeze({
${rows(table.elements, '        ')}
    }),
    swingClips: Object.freeze(${q(table.swingClips)}),
    hitPool: Object.freeze(${q(table.hitPool)}),
    clips: Object.freeze({
${rows(table.clips, '        ')}
    }),
    gems: Object.freeze({
${rows(table.gems, '        ')}
    }),
    meta: Object.freeze({
${rows(table.meta, '        ')}
    }),
    motions: Object.freeze({
${rows(table.motions, '        ')}
    }),
    bless: Object.freeze({
        spin: ${table.bless.spin},
        floors: Object.freeze(${q(table.bless.floors)}),
        colours: Object.freeze(${q(table.bless.colours)}),
        runes: Object.freeze(${q(table.bless.runes)})
    }),
    polish: Object.freeze(${q(table.polish)}),
    censerHeads: Object.freeze(${q(table.censerHeads)}),
    wisps: Object.freeze(${q(table.wisps)}),
    raw: Object.freeze(${q(table.raw)}),
    atlas: Object.freeze({
${rows(table.atlas, '        ')}
    })
});
safeExposeData({ STAGE_SKILL_VFX });
`;
fs.writeFileSync(tableFile, text);
console.log(`그림 ${sheet.width}×${sheet.height} ${(fs.statSync(pictureFile).size / 1048576).toFixed(2)}MB, 새 칸 묶음 ${Object.keys(atlasAdded).join(', ')}, 띠 ${Object.keys(rawTable).join(', ')}, 판 ${table.version}`);
