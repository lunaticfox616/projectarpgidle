#!/usr/bin/env node
/* 지역 무대 묶음(regions-kit-v2: 지역 28곳의 방 그림 한 장씩, 재질 14가지의 문 네 방향과 소품 여덟 가지)을 게임이 읽는 모양으로 옮긴다
 * (docs/stage-view-20261011.md).
 *
 *   node scripts/build-stage-regions.cjs <묶음 폴더> [복사해 둘 폴더]
 *
 * 묶음의 kit-manifest.json을 읽어
 *   그림: assets/stage-scenes/regions/<지역>.png, assets/stage-scenes/regions/<재질>/<조각>.png
 *         (저장소에 넣지 않는다, .gitignore의 /assets/stage-scenes/). [복사해 둘 폴더]에도 regions/ 아래에 똑같이 둔다.
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
/** 조각의 표 줄: [가로, 세로, 발 x, 발 y, 그림이 차지하는 상자의 왼쪽, 위, 가로, 세로] 뒤에, 문틀이면 뚫린 자리의 꼭짓점들(x, y가 차례로). */
function pieceRow(asset) {
    const box = asset.bbox, row = [asset.width, asset.height, asset.anchor[0], asset.anchor[1], box.left, box.top, box.width, box.height];
    return asset.cavityPolygon ? [...row, ...asset.cavityPolygon.flat()] : row;
}
/** 닫힌 문의 덧그림 줄: [가로, 세로, 그림이 차지하는 상자의 왼쪽, 위, 가로, 세로]. */
const lockRow = asset => [asset.width, asset.height, asset.bbox.left, asset.bbox.top, asset.bbox.width, asset.bbox.height];

const families = {};
for (const [id, family] of Object.entries(kit.families)) {
    const pieces = {}, locks = {};
    for (const [name, asset] of Object.entries(family.assets)) {
        const kind = /-(ruin-lock|lock)$/.exec(name);
        copy(asset.file, `${short(id)}/${name}.png`);
        if (kind) locks[name] = lockRow(asset); else pieces[name] = pieceRow(asset);
    }
    families[short(id)] = { pieces, locks };
}
const regions = {};
for (const region of kit.regions) {
    const png = decodePng(copy(region.file, region.id + '.png')), rules = region.roomRules;
    // 보스 방의 큰 구조물이 서는 쪽: 묶음의 메모가 왼쪽이라 적은 지역은 왼쪽, 나머지는 오른쪽(문이 그쪽에 나면 게임이 반대쪽으로 옮긴다).
    const left = /west edge|left edge|left foreground|left of|left corner/i.test(rules.boss.note || '');
    regions[region.id] = { name: region.name.replace(/\s*·\s*/, ', '), width: region.width, height: region.height, ground: region.groundY,
        door: region.northDoorX ?? null, family: short(region.family), sky: bandColour(png, 0, 4), earth: bandColour(png, png.height - 4, 4),
        normal: rules.normal.props, elite: rules.elite.props, boss: rules.boss.props, bossSide: left ? 'west' : 'east',
        // 무너진 중정(액트 6)은 닫힌 문에 창살 대신 무너진 돌무더기를 쓴다(묶음의 조립 화면이 그렇게 고른다).
        ruin: region.id === 'act-06' };
}

const version = hash.digest('hex').slice(0, 10);
const list = values => `Object.freeze([${values.join(', ')}])`;
const quoted = value => (value === null ? 'null' : typeof value === 'string' ? `'${value}'` : String(value));
const familyText = Object.entries(families).map(([id, family]) => `        ${id}: Object.freeze({\n            pieces: Object.freeze({ ${Object.entries(family.pieces)
    .map(([name, row]) => `'${name}': ${list(row)}`).join(', ')} }),\n            locks: Object.freeze({ ${Object.entries(family.locks)
    .map(([name, row]) => `'${name}': ${list(row)}`).join(', ')} })\n        })`).join(',\n');
const regionText = Object.entries(regions).map(([id, region]) => `        '${id}': Object.freeze({ ${Object.entries(region)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? list(value) : quoted(value)}`).join(', ')} })`).join(',\n');
const text = `// 지역 무대 묶음 (js/canvas-stage-region.js). scripts/build-stage-regions.cjs가 만든 표다: 손으로 고치지 않는다.
// 2026-10-12 사용자가 이미지 생성으로 만들어 온 "지역 무대 조립본"(regions-kit-v2): 지역마다 방 그림 한 장(뒤쪽 풍경과 바닥이 한 장에
// 있다), 재질마다 네 방향의 문틀과 닫힌 문의 덧그림, 소품 여덟 가지. 그림은 assets/stage-scenes/regions/ 아래에 두고 저장소에 넣지 않는다.
//   fit     방 그림을 놓는 기준 화면(캐릭터 도트): width 가로(스무 칸), height 세로, floorBottom 바닥의 앞쪽 끝이 놓이는 줄,
//           margin 방 바닥의 양옆으로 카메라가 더 보여 주는 너비의 합. 방 그림은 이 화면을 덮는 가장 작은 배율로, 늘이거나 이어 붙이지
//           않고 가운데를 맞춰 놓는다(js/stage-region-fit.js). 그림이 닿지 않는 위아래는 sky, earth 색으로 메운다.
//   families 재질 → pieces 조각: 이름 → [가로, 세로, 발 x, 발 y, 그림이 차지하는 상자의 왼쪽, 위, 가로, 세로, (문틀이면) 뚫린 자리의 꼭짓점 x, y, ...].
//           조각 그림은 캐릭터 도트 하나에 1px.
//           locks 닫힌 문의 덧그림: 이름 → [가로, 세로, 그림이 차지하는 상자의 왼쪽, 위, 가로, 세로]. 문틀의 뚫린 자리 안에만 그린다.
//           prop-0, prop-1 낮은 소품, prop-2 정예 방의 높은 표식, prop-3 보스 방의 큰 구조물, prop-4와 5 상자의 닫힌 모습과 열린 모습,
//           prop-6과 7 깨지는 물건의 깨지기 전과 뒤.
//   regions 지역 → 방 그림(<지역>.png)의 가로와 세로, ground 바닥이 시작하는 줄, door 뒤쪽 문이 서는 가로 자리(그림 너비의 비율, 없으면 null),
//           family 재질, sky와 earth 그림 맨 위와 맨 아래의 색, normal, elite, boss 그 구실의 방에 놓는 소품 번호, bossSide 보스 방의 큰 구조물이 서는 쪽,
//           ruin 닫힌 문에 무너진 돌무더기 덧그림을 쓰는 지역.
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
console.log(`지역 ${Object.keys(regions).length}곳, 재질 ${Object.keys(families).length}가지, 그림 ${files}장 ${(bytes / 1048576).toFixed(1)}MB, 판 ${version}`);
