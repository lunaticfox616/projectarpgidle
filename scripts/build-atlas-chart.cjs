#!/usr/bin/env node
/* 천문도 구조 자료(modules/data/sources/atlas-structure.json, 사용자의 아틀라스 개편 패키지 2026-11-24)를 게임이 읽는 표
 * modules/data/atlas-chart.mjs로 옮긴다. 표는 이 도구가 만든다: 손으로 고치지 않고 JSON을 고친 뒤 다시 만든다.
 *
 *   node scripts/build-atlas-chart.cjs           # 표를 다시 쓴다
 *   node scripts/build-atlas-chart.cjs --check   # 쓰지 않고, 표가 JSON과 다르면 1로 끝난다
 *
 * scripts/smoke-atlas.js가 render()로 같은 비교를 한다(JSON과 표가 어긋나면 npm test가 멈춘다).
 * 옮기는 것: 지도 50곳과 보스 10곳(자리, 부모, 굽이 점), 길 62개(SVG 경로), 표식, 권역, 패시브 별 24개(자리, 효과 수치와 효과 글)와
 * 이음 37개, 시작 별, 이정표. 효과 글의 가운뎃점은 쉼표로 바꾼다(화면 글 규칙).
 * 옮기지 않는 것: 시뮬레이터의 편집기 설정(layout), 미적용 항목(underReview), 갈래의 아이콘과 초점 글.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'modules', 'data', 'sources', 'atlas-structure.json');
const TARGET = path.join(ROOT, 'modules', 'data', 'atlas-chart.mjs');
const PICTURE = 'assets/ui/atlas-star-chart-20261124.webp';

const fail = message => { throw new Error(`atlas-structure.json: ${message}`); };

/** via는 점 하나([x, y])이거나 점 목록이다: 언제나 점 목록으로. */
function bends(via) {
    if (!Array.isArray(via) || !via.length) return [];
    return Array.isArray(via[0]) ? via : [via];
}

function bossKind(node) {
    if (node.reward) return 'guardian';
    if (node.requiredKeys.length) return 'region';
    if (node.innerEntry) return 'tree';
    if (node.region === 'outer') return 'outer';
    return fail(`보스 ${node.id}의 종류를 알 수 없음`);
}

function mapRow(node) {
    if (node.parents.length !== 1) fail(`지도 ${node.id}의 부모가 하나가 아님`);
    return { id: node.id, name: node.name, side: node.side, region: node.region, tier: node.tier, point: node.point, parent: node.parents[0],
        via: bends(node.via), temple: node.templeId || null, treeBoss: node.treeBoss || null };
}

function bossRow(node) {
    const via = node.approachVias ? Object.fromEntries(Object.entries(node.approachVias).map(([from, point]) => [from, bends(point)])) : null;
    return { id: node.id, name: node.name, kind: bossKind(node), gate: node.gateLabel || null, token: node.token, side: node.side, region: node.region,
        point: node.point, parents: node.parents, keys: node.requiredKeys, key: node.reward || null, via: via || bends(node.via),
        temple: node.templeId || null, treeBoss: node.treeBoss || null, entry: node.innerEntry || null };
}

function routeRow(route) {
    return { from: route.from, to: route.to, side: route.side, hidden: route.hidden === true, guardianEntry: route.guardianEntry === true, path: route.svgPath };
}

/** 화면 글에는 가운뎃점을 쓰지 않는다: 패키지의 효과 글에 있는 것은 쉼표로. */
const plainText = text => String(text).replace(/\s*·\s*/g, ', ');

function starRow(star, starts) {
    return { id: star.id, name: star.name, label: star.label || null, side: star.side, branch: star.branchName, point: star.point,
        start: starts.includes(star.id), keystone: star.keystone === true, bonuses: star.bonuses, effect: plainText(star.effect), neighbors: star.neighbors };
}

/** 새 천문도의 노드가 쓰는 권역만(JSON에는 시뮬레이터의 예전 화면이 쓰는 canopy, sanctum, trunk도 있다). */
function usedRegions(regions, nodes) {
    return Object.fromEntries(Object.entries(regions).filter(([id]) => nodes.some(node => node.region === id)));
}

function check(chart) {
    const ids = new Set([...chart.maps, ...chart.bosses].map(node => node.id)), known = id => id === 'entry' || ids.has(id);
    if (chart.maps.length !== 50 || chart.bosses.length !== 10 || ids.size !== 60) fail(`지도 ${chart.maps.length}, 보스 ${chart.bosses.length}, id ${ids.size}`);
    if (chart.routes.length !== 62) fail(`길 ${chart.routes.length}`);
    for (const node of [...chart.maps, ...chart.bosses]) if (!chart.regions[node.region]) fail(`권역 ${node.region}`);
    for (const node of chart.maps) if (!known(node.parent) || !Number.isInteger(node.tier) || node.tier < 1 || node.tier > chart.tiers) fail(`지도 ${node.id}`);
    for (const node of chart.bosses) if (!node.parents.every(known) || !node.keys.every(known)) fail(`보스 ${node.id}`);
    for (const route of chart.routes) if (!known(route.from) || !ids.has(route.to) || !/^M[\d.,\sLQ-]+$/.test(route.path)) fail(`길 ${route.from} → ${route.to}`);
    const passive = chart.passive, stars = new Set(passive.stars.map(star => star.id));
    if (stars.size !== 24 || passive.links.length !== 37 || passive.starts.length !== 3) fail(`별 ${stars.size}, 이음 ${passive.links.length}, 시작 ${passive.starts.length}`);
    if (!passive.links.every(link => link.every(id => stars.has(id))) || !passive.starts.every(id => stars.has(id))) fail('패시브 이음');
    if (passive.milestones.length !== passive.maximumPoints || passive.milestones.some((n, i) => i && n <= passive.milestones[i - 1])) fail('이정표');
}

function build(source) {
    const maps = source.mapNodes.filter(node => node.tier).map(mapRow), bosses = source.mapNodes.filter(node => !node.tier).map(bossRow);
    const chart = {
        sourceVersion: source.sourceVersion, asOf: source.asOf,
        picture: { src: PICTURE, width: source.backgroundImage.sizePx[0], height: source.backgroundImage.sizePx[1] },
        viewBox: source.routeViewBox, tiers: Math.max(...maps.map(node => node.tier)),
        regions: usedRegions(source.regions, [...maps, ...bosses]), landmarks: source.landmarks, maps, bosses, routes: source.routes.map(routeRow),
        passive: { maximumPoints: source.passive.maximumPoints, milestones: source.passive.milestones, starts: source.passive.starts,
            links: source.passive.links, branches: source.passive.branches.map(row => ({ side: row.side, name: row.name, stars: row.stars.map(star => star.id) })),
            stars: Object.values(source.passive.stars).map(star => starRow(star, source.passive.starts)) }
    };
    check(chart);
    return chart;
}

/** 한 줄에 한 항목: 표의 차이가 줄 단위로 보인다. */
function listText(name, rows) { return `    ${name}: [\n${rows.map(row => `        ${JSON.stringify(row)}`).join(',\n')}\n    ]`; }

function render(source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'))) {
    const chart = build(source), plain = ['sourceVersion', 'asOf', 'picture', 'viewBox', 'tiers', 'regions', 'landmarks'];
    const passive = `    passive: {\n        maximumPoints: ${chart.passive.maximumPoints}, milestones: ${JSON.stringify(chart.passive.milestones)}, starts: ${JSON.stringify(chart.passive.starts)},\n`
        + `        links: ${JSON.stringify(chart.passive.links)},\n        branches: ${JSON.stringify(chart.passive.branches)},\n`
        + `        stars: [\n${chart.passive.stars.map(row => `            ${JSON.stringify(row)}`).join(',\n')}\n        ]\n    }`;
    return `// 천문도(아틀라스 개편 2026-11-24)의 구조 표. scripts/build-atlas-chart.cjs가 modules/data/sources/atlas-structure.json에서 만든다.\n`
        + `// 손으로 고치지 않는다: JSON을 고치고 도구를 다시 돌린다(어긋나면 scripts/smoke-atlas.js가 멈춘다).\n`
        + `// 좌표는 그림(picture)의 백분율, 길(routes[].path)은 viewBox 0 0 100 100의 SVG 경로다. maps[].parent의 'entry'는 시작 육분의.\n`
        + `// passive: 아틀라스 패시브의 별 24개(js/atlas-passives.js). 별의 side는 효과가 닿는 지도의 side, bonuses는 그 효과 수치다.\n`
        + `const freeze = value => {\n    if (value && typeof value === 'object') Object.values(value).forEach(freeze);\n    return Object.freeze(value);\n};\n`
        + `const ATLAS_CHART = freeze({\n${plain.map(key => `    ${key}: ${JSON.stringify(chart[key])}`).join(',\n')},\n`
        + `${listText('maps', chart.maps)},\n${listText('bosses', chart.bosses)},\n${listText('routes', chart.routes)},\n${passive}\n});\nexport { ATLAS_CHART };\n`;
}

function main() {
    const text = render(), current = fs.existsSync(TARGET) ? fs.readFileSync(TARGET, 'utf8').replace(/\r\n/g, '\n') : '';
    if (process.argv.includes('--check')) {
        if (text === current) return console.log('atlas-chart.mjs: JSON과 같음');
        console.error('modules/data/atlas-chart.mjs가 atlas-structure.json과 다릅니다. node scripts/build-atlas-chart.cjs를 실행하세요.');
        process.exitCode = 1;
        return;
    }
    if (text !== current) fs.writeFileSync(TARGET, text);
    console.log(`atlas-chart.mjs: 지도 50, 보스 10, 길 62${text === current ? ' (변경 없음)' : ''}`);
}

if (require.main === module) main();
module.exports = { render, TARGET };
