#!/usr/bin/env node
/* 지역 무대 묶음(regions-kit-v2: 지역 28곳의 방 그림 한 장씩, 재질 14가지의 소품 여덟 가지)을 게임이 읽는 모양으로 옮긴다
 * (docs/stage-view-20261011.md). 묶음의 문틀과 닫힌 문 그림(door-*)은 옮기지 않는다: 문은 공용 뿌리 봉인이 맡는다.
 *
 *   node scripts/build-stage-regions.cjs <묶음 폴더> [복사해 둘 폴더]
 *   node scripts/build-stage-regions.cjs --refresh-current
 *     게임에 있는 그림의 캐시 키와 위아래 메움 색만 다시 잰다. 조립 수치와 방·소품 배치는 바꾸지 않는다.
 *   node scripts/build-stage-regions.cjs --add-variant <지역> <이름> <본뜰 지역> <방 그림.png>
 *     묶음 밖의 방 그림 한 장을 본뜰 지역과 같은 크기, 바닥 줄, 문 자리, 재질, 소품 규칙으로 더한다(2026-10-20 심해의 수심 띠).
 *     묶음을 다시 옮길 때 묶음에 없는 지역은 표에 있던 그대로 남는다.
 *   node scripts/build-stage-regions.cjs --act-rework <배포 폴더>
 *     액트 1~10을 다시 그린 배포(2026-10-30 RIGNIN-PixelLab-Pro-COMPLETE-game-assets, delivery-layout.json)를 옮긴다. 액트 2~10은
 *     방 그림, 액트마다의 소품(재질 A02~A10), 일반 방 그림과 다른 정예와 보스 방 그림(rooms)이고, 가운데에 보스 구조물이 그려진 보스 방
 *     그림이면 보스 방 소품을 두지 않는다. 액트 1은 뿌리 성소 묶음(data/stage-view.js STAGE_SCENES)의 먼 배경, 뒤쪽 띠, 바닥과
 *     정예와 보스 방의 먼 배경, 보스 구조물을 root-end-v5/에 옮긴다(그 표는 손으로 고친다). 어느 지역도 쓰지 않게 된 재질은 지운다.
 *
 * 묶음의 kit-manifest.json을 읽어
 *   그림: assets/stage-scenes/regions/<지역>.png, assets/stage-scenes/regions/<재질>/<조각>.png
 *         (2026-10-16부터 게임과 함께 저장소에 넣는다). [복사해 둘 폴더]에도 regions/ 아래에 똑같이 둔다.
 *   표: data/stage-regions.js (수치만 있다).
 * 방 그림의 맨 윗줄과 맨 아랫줄의 평균 색을 재서 표에 적는다: 그림이 닿지 않는 화면 위아래를 그 색으로 메운다.
 * 원본은 읽기만 한다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decodePng } = require('./lib/png.cjs');

const root = path.join(__dirname, '..');
const [from, mirror] = process.argv.slice(2);
if (from === '--refresh-current') { refreshCurrent(); process.exit(0); }
if (from === '--add-variant') { addVariant(process.argv.slice(3)); refreshCurrent(); process.exit(0); }
if (from === '--act-rework') { importActRework(process.argv[3]); refreshCurrent(); process.exit(0); }
if (!from) { console.error('쓰는 법: node scripts/build-stage-regions.cjs <묶음 폴더> [복사해 둘 폴더]'); process.exit(1); }
const kit = JSON.parse(fs.readFileSync(path.join(from, 'kit-manifest.json'), 'utf8'));
const outs = [path.join(root, 'assets/stage-scenes/regions'), ...(mirror ? [path.join(mirror, 'regions')] : [])];
const hash = crypto.createHash('sha1');
let files = 0, bytes = 0;

function copy(source, name) {
    const data = fs.readFileSync(path.join(from, source));
    hash.update(name).update(data);
    for (const out of outs) {
        fs.mkdirSync(path.dirname(path.join(out, name)), { recursive: true });
        fs.writeFileSync(path.join(out, name), data);
    }
    files++; bytes += data.length;
    return data;
}
const hex = value => Math.round(value).toString(16).padStart(2, '0');
/** 그림 한 줄(rows줄)의 평균 색. */
function bandColour(png, top, rows) {
    const sum = [0, 0, 0];
    for (let y = top; y < top + rows; y++) for (let x = 0; x < png.width; x++) for (let c = 0; c < 3; c++) sum[c] += png.data[(y * png.width + x) * 4 + c];
    return '#' + sum.map(value => hex(value / (rows * png.width))).join('');
}
/** 재질의 짧은 이름: 'F01-courtyard-limestone' → 'F01'. */
const short = family => family.split('-')[0];
/** 조각의 표 줄: [가로, 세로, 발 x, 발 y, 그림이 차지하는 상자의 왼쪽, 위, 가로, 세로]. */
const pieceRow = asset => [asset.width, asset.height, asset.anchor[0], asset.anchor[1], asset.bbox.left, asset.bbox.top, asset.bbox.width, asset.bbox.height];

const families = {};
for (const [id, family] of Object.entries(kit.families)) {
    const pieces = {};
    for (const [name, asset] of Object.entries(family.assets)) {
        if (name.startsWith('door-')) continue;
        copy(asset.file, `${short(id)}/${name}.png`);
        pieces[name] = pieceRow(asset);
    }
    families[short(id)] = { pieces };
}
const regions = {};
for (const region of kit.regions) {
    const png = decodePng(copy(region.file, region.id + '.png')), rules = region.roomRules;
    // 보스 방의 큰 구조물이 서는 쪽: 묶음의 메모가 왼쪽이라 적은 지역은 왼쪽, 나머지는 오른쪽(문이 그쪽에 나면 게임이 반대쪽으로 옮긴다).
    const left = /west edge|left edge|left foreground|left of|left corner/i.test(rules.boss.note || '');
    regions[region.id] = { name: region.name.replace(/\s*·\s*/, ', '), width: region.width, height: region.height, ground: region.groundY,
        door: region.northDoorX ?? null, family: short(region.family), sky: bandColour(png, 0, 4), earth: bandColour(png, png.height - 4, 4),
        normal: rules.normal.props, elite: rules.elite.props, boss: rules.boss.props, bossSide: left ? 'west' : 'east' };
}
// 묶음 밖에서 더한 지역(--add-variant)은 표에 있던 줄 그대로 남긴다
for (const [id, region] of Object.entries(currentTable().regions)) {
    if (regions[id]) continue;
    regions[id] = { ...region };
    hash.update(id + '.png').update(fs.readFileSync(path.join(outs[0], id + '.png')));
    console.log(`묶음 밖 지역 유지: ${id}`);
}

writeTable(families, regions, hash.digest('hex').slice(0, 10));
console.log(`지역 ${Object.keys(regions).length}곳, 재질 ${Object.keys(families).length}가지, 그림 ${files}장 ${(bytes / 1048576).toFixed(1)}MB`);

/** 표(data/stage-regions.js)를 쓴다. */
function writeTable(families, regions, version) {
    const list = values => `Object.freeze([${values.join(', ')}])`;
    const quoted = value => (value === null ? 'null' : typeof value === 'string' ? `'${value}'` : String(value));
    const named = value => `Object.freeze({ ${Object.entries(value).map(([key, item]) => `${key}: ${quoted(item)}`).join(', ')} })`;
    const valueText = value => (Array.isArray(value) ? list(value) : value && typeof value === 'object' ? named(value) : quoted(value));
    const familyText = Object.entries(families).map(([id, family]) => `        ${id}: Object.freeze({\n            pieces: Object.freeze({ ${Object.entries(family.pieces)
        .map(([name, row]) => `'${name}': ${list(row)}`).join(', ')} })\n        })`).join(',\n');
    const regionText = Object.entries(regions).map(([id, region]) => `        '${id}': Object.freeze({ ${Object.entries(region)
        .map(([key, value]) => `${key}: ${valueText(value)}`).join(', ')} })`).join(',\n');
    const text = `// 지역 무대 묶음 (js/canvas-stage-region.js). scripts/build-stage-regions.cjs가 만든 표다: 손으로 고치지 않는다.
// 2026-10-12 사용자가 이미지 생성으로 만들어 온 "지역 무대 조립본"(regions-kit-v2): 지역마다 방 그림 한 장(뒤쪽 풍경과 바닥이 한 장에
// 있다), 재질마다 소품 여덟 가지. 그림은 assets/stage-scenes/regions/ 아래에 두고 저장소에 넣는다. 문은 공용 뿌리 봉인
// (data/stage-view.js STAGE_ROOMS.rootSeal)이 맡는다.
//   fit     방 그림을 놓는 기준 화면(캐릭터 도트): width 가로(스무 칸), height 세로, floorBottom 바닥의 앞쪽 끝이 놓이는 줄,
//           margin 방 바닥의 양옆으로 카메라가 더 보여 주는 너비의 합. 방 그림은 이 화면을 덮는 가장 작은 배율로, 늘이거나 이어 붙이지
//           않고 가운데를 맞춰 놓는다(js/stage-region-fit.js). 그림이 닿지 않는 위아래는 sky, earth 색으로 메운다.
//   families 재질 → pieces 조각: 이름 → [가로, 세로, 발 x, 발 y, 그림이 차지하는 상자의 왼쪽, 위, 가로, 세로].
//           조각 그림은 캐릭터 도트 하나에 1px.
//           prop-0, prop-1 낮은 소품, prop-2 정예 방의 높은 표식, prop-3 보스 방의 큰 구조물, prop-4와 5 상자의 닫힌 모습과 열린 모습,
//           prop-6과 7 깨지는 물건의 깨지기 전과 뒤.
//   regions 지역 → 방 그림(<지역>.png)의 가로와 세로, ground 바닥이 시작하는 줄, door 뒤쪽 문이 서는 가로 자리(그림 너비의 비율, 없으면 null),
//           family 재질, sky와 earth 그림 맨 위와 맨 아래의 색, normal, elite, boss 그 구실의 방에 놓는 소품 번호, bossSide 보스 방의 큰 구조물이 서는 쪽,
//           rooms(있으면) 방 구실 → 그 방에만 쓰는 방 그림(<이름>.png, 크기와 바닥 줄은 지역과 같다): general 입구와 전투 방과 곁방, elite, boss.
//           2026-10-30 액트 2~10은 PixelLab Pro로 다시 그린 묶음(재질 A02~A10, 정예와 보스 방 그림)이다(--act-rework).
const STAGE_REGIONS = Object.freeze({
    path: 'assets/stage-scenes/regions/',
    version: '${version}',
    fit: Object.freeze({ width: 1280, height: 720, floorBottom: 536, margin: 192 }),
    families: Object.freeze({
${familyText}
    }),
    regions: Object.freeze({
${regionText}
    })
});
safeExposeData({ STAGE_REGIONS });
`;
    fs.writeFileSync(path.join(root, 'data/stage-regions.js'), text);
}

/** 지금 표(data/stage-regions.js)를 읽는다. */
function currentTable() {
    let current;
    require('node:vm').runInNewContext(fs.readFileSync(path.join(root, 'data/stage-regions.js'), 'utf8'), { safeExposeData: data => { current = data.STAGE_REGIONS; } });
    return current;
}
/** 묶음 밖의 방 그림 한 장을 지역으로 더한다: 그림을 옮기고, 본뜰 지역의 줄을 이름만 바꿔 그 줄 아래에 둔다(메움 색과 캐시 키는
 * 뒤이어 refreshCurrent가 잰다). 그림 크기가 본뜰 지역과 다르면 멈춘다(바닥 줄과 문 자리가 그 크기의 값이다). */
function addVariant([id, name, like, picture]) {
    if (!id || !name || !like || !picture) throw new Error('쓰는 법: --add-variant <지역> <이름> <본뜰 지역> <방 그림.png>');
    const current = currentTable(), base = current.regions[like], data = fs.readFileSync(picture), png = decodePng(data);
    if (!base) throw new Error(like + ': 표에 없는 지역');
    if (png.width !== base.width || png.height !== base.height) throw new Error(`${id}: 그림 ${png.width}x${png.height}, ${like}는 ${base.width}x${base.height}`);
    fs.writeFileSync(path.join(root, current.path, id + '.png'), data);
    const file = path.join(root, 'data/stage-regions.js'), lines = fs.readFileSync(file, 'utf8').split('\n');
    const head = key => `        '${key}': Object.freeze({`;
    const kept = lines.filter(line => !line.startsWith(head(id))), at = kept.findIndex(line => line.startsWith(head(like)));
    const row = kept[at].replace(head(like), head(id)).replace(/name: '[^']*'/, `name: '${name}'`).replace(/,$/, '');
    kept[at] = kept[at].replace(/,?$/, ',');
    kept.splice(at + 1, 0, kept[at + 1].startsWith(`        '`) ? row + ',' : row);
    fs.writeFileSync(file, kept.join('\n'));
    console.log(`지역 더함: ${id} (${name}), ${like}를 본뜸`);
}
/** 그림의 불투명한 자리를 감싸는 상자: [왼쪽, 위, 가로, 세로]. */
function alphaBox(png) {
    let left = png.width, top = png.height, right = -1, bottom = -1;
    for (let y = 0; y < png.height; y++) {
        for (let x = 0; x < png.width; x++) {
            if (!png.data[(y * png.width + x) * 4 + 3]) continue;
            left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
    }
    return [left, top, right - left + 1, bottom - top + 1];
}
/** 액트 하나(2~10)의 방 그림, 소품, 구실별 방 그림을 옮기고 표의 줄을 고친다. */
function importActRegion(from, layout, table, act) {
    const id = 'act-' + String(act).padStart(2, '0'), region = table.regions[id], family = 'A' + id.slice(4);
    const folder = path.join(root, table.path), scenes = path.join(from, 'assets/stage-scenes');
    fs.copyFileSync(path.join(scenes, 'regions', id + '.png'), path.join(folder, id + '.png'));
    const kit = fs.readdirSync(scenes).find(name => name.startsWith(`act${id.slice(4)}-`) && fs.existsSync(path.join(scenes, name, 'props')));
    const pieces = {};
    fs.mkdirSync(path.join(folder, family), { recursive: true });
    for (const name of fs.readdirSync(path.join(scenes, kit, 'props')).filter(file => file.endsWith('.png')).sort()) {
        const data = fs.readFileSync(path.join(scenes, kit, 'props', name)), png = decodePng(data);
        fs.writeFileSync(path.join(folder, family, name), data);
        pieces[name.slice(0, -4)] = [png.width, png.height, png.width / 2, png.height - 4, ...alphaBox(png)];
    }
    table.families[family] = { pieces };
    region.family = family;
    const rooms = {};
    for (const role of layout.roles.filter(row => row.act === act)) {
        const picture = role.compatible_composite && role.compatible_composite.path;
        if (!picture || picture === `assets/stage-scenes/regions/${id}.png`) continue;
        const png = decodePng(fs.readFileSync(path.join(from, picture)));
        if (png.width !== region.width || png.height !== region.height || role.geometry.ground !== region.ground) throw new Error(`${id} ${role.room_type}: 크기나 바닥 줄이 지역과 다르다`);
        fs.copyFileSync(path.join(from, picture), path.join(folder, `${id}-${role.room_type}.png`));
        rooms[role.room_type] = `${id}-${role.room_type}`;
        // 보스 구조물이 방 그림의 가운데에 그려져 있다: 보스 방 소품(prop-3)을 또 세우지 않는다
        if (role.room_type === 'boss' && role.geometry.boss_object_offset) region.boss = [];
    }
    if (Object.keys(rooms).length) region.rooms = rooms;
    else delete region.rooms;
}
/** 액트 1: 뿌리 성소 묶음의 그림(이름은 그대로)과 정예, 보스 방의 먼 배경(backdrop-elite, backdrop-boss), 보스 구조물(boss-object). */
function importActOne(from, layout) {
    const kit = path.join(root, 'assets/stage-scenes/root-end-v5'), put = (source, name) => fs.copyFileSync(path.join(from, source), path.join(kit, name));
    for (const name of ['backdrop', 'rear-strip', 'floor-a', 'floor-b', 'floor-c']) put(`assets/stage-scenes/root-end-v5/${name}.png`, name + '.png');
    for (const role of layout.roles.filter(row => row.act === 1 && row.room_type !== 'general')) {
        put(role.compatible_composite.path, `backdrop-${role.room_type}.png`);
        const object = role.native_layers_back_to_front.find(layer => layer.id === 'boss-object');
        if (!object) continue;
        put(object.path, 'boss-object.png');
        const png = decodePng(fs.readFileSync(path.join(from, object.path)));
        console.log(`액트 1 보스 구조물 ${png.width}x${png.height}, 상자 ${alphaBox(png).join(', ')}, 발 ${object.foot}`);
    }
}
function importActRework(from) {
    if (!from) throw new Error('쓰는 법: --act-rework <배포 폴더>');
    const layout = JSON.parse(fs.readFileSync(path.join(from, 'delivery-layout.json'), 'utf8'));
    const table = JSON.parse(JSON.stringify(currentTable()));
    for (let act = 2; act <= 10; act++) importActRegion(from, layout, table, act);
    const used = new Set(Object.values(table.regions).map(region => region.family));
    for (const id of Object.keys(table.families).filter(family => !used.has(family))) {
        delete table.families[id];
        fs.rmSync(path.join(root, table.path, id), { recursive: true });
        console.log(`쓰지 않게 된 재질 지움: ${id}`);
    }
    importActOne(from, layout);
    writeTable(table.families, table.regions, table.version);
}
/** 기존 게임 그림을 색 보정한 뒤, 재수입 없이 표의 캐시 키와 메움 색만 갱신한다. */
function refreshCurrent() {
    const file = path.join(root, 'data/stage-regions.js'), original = fs.readFileSync(file, 'utf8');
    const current = currentTable();
    const digest = crypto.createHash('sha1'), folder = path.join(root, current.path);
    const colour = (png, top) => {
        const sum = [0, 0, 0];
        for (let y = top; y < top + 4; y++) for (let x = 0; x < png.width; x++) {
            for (let c = 0; c < 3; c++) sum[c] += png.data[(y * png.width + x) * 4 + c];
        }
        return '#' + sum.map(v => Math.round(v / (4 * png.width)).toString(16).padStart(2, '0')).join('');
    };
    let updated = original;
    for (const [id, region] of Object.entries(current.regions)) {
        const png = decodePng(fs.readFileSync(path.join(folder, id + '.png')));
        if (png.width !== region.width || png.height !== region.height) throw new Error(id + ': 그림 크기가 바뀌었다');
        const line = new RegExp(`('${id}': Object.freeze\\(\\{[^\\n]+)`);
        updated = updated.replace(line, text => text.replace(/sky: '#[0-9a-f]+', earth: '#[0-9a-f]+'/,
            `sky: '${colour(png, 0)}', earth: '${colour(png, png.height - 4)}'`));
    }
    const files = Object.entries(current.regions).flatMap(([id, region]) => [id, ...Object.values(region.rooms || {})].map(name => name + '.png'));
    for (const [id, family] of Object.entries(current.families)) {
        for (const name of Object.keys(family.pieces)) files.push(id + '/' + name + '.png');
    }
    for (const name of files.sort()) digest.update(name).update(fs.readFileSync(path.join(folder, name)));
    const version = digest.digest('hex').slice(0, 10);
    updated = updated.replace(/version: '[^']+'/, `version: '${version}'`);
    fs.writeFileSync(file, updated);
    console.log(`기존 ${Object.keys(current.regions).length}개 지역의 메움 색·캐시 키 갱신: ${version}. 조립 수치 유지.`);
}
