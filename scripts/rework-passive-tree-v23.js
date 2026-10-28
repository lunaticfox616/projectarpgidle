#!/usr/bin/env node
'use strict';

/**
 * 2026-10-28 스킬트리 v23 개편(사용자: PoE 패시브 조사 보고서의 1, 2단계를 함께, 출시할 완성본으로). 편집 원본 하나를 받아 새 원본을 쓴다.
 *   node scripts/rework-passive-tree-v23.js <source.json> <output.json>
 *   node scripts/build-passive-tree-runtime.js <output.json> data/passive-tree-v22.js
 * 한 번만 적용한다: 출력에 layoutRework 'v23'을 남기고, 입력에 이미 있으면 멈춘다. 노드 id는 지우지도 바꾸지도 않으며(새 노드만 더한다)
 * 트리 배치 버전(PASSIVE_LAYOUT_VERSION 22)도 그대로다. 끊긴 노드는 불러올 때 포인트로 돌아온다(js/save-migrations.js).
 * 배치: 간격 ×1.35, 통로 위 주요를 곁가지로, 외톨이 주요 앞에 보조 하나, 선이 지나는 노드는 비켜 놓기(lib/passive-tree-v23-layout).
 * 옵션: 중심 빈 고리, 효과 없는 옵션, 공격과 방어가 섞인 주요, 약한 주요, 막다른 작은 노드, 첫 다섯 칸, 첫 공격 주요(lib/passive-tree-v23-options).
 * 다듬기(같은 날 두 번째 요청): 이름과 맞지 않는 피해, 길목과 고리의 소형을 일반으로, 에너지 보호막 플랫, 방어 % 표, 신비/계시/순환
 * 단일 소형(lib/passive-tree-v23-polish).
 */

const assert = require('assert');
const fs = require('fs');
const { buildGraph, graphDistances, isIntendedSpecial, readTree } = require('./audit-passive-tree-source');
const { STAT_META, isReadablePassiveValue } = require('./lib/passive-tree-option-catalog');
const { visualBundleAudit } = require('./lib/passive-tree-clusters');
const layout = require('./lib/passive-tree-v23-layout');
const options = require('./lib/passive-tree-v23-options');
const polish = require('./lib/passive-tree-v23-polish');

const ACTIONABLE = new Set(['minor', 'assist', 'normal', 'major']);
const CLASS_IDS = ['occultist', 'wanderer', 'cleric', 'archer', 'alchemist', 'warrior'];
const SPECIAL_STATS = ['mystique', 'devotion', 'cycle'];
/** Flat energy shield nodes left after the polish (111 before it). */
const FLAT_SHIELD_LIMIT = 25;

function newReport() {
    return { detached: [], detachSkipped: [], approaches: [], approachSkipped: [], nudged: [], centreFilled: [], deadStats: [], purified: [],
        lifted: [], promotedLeaves: [], openings: [], firstNotables: [], firstNotableMissing: [], rounded: [], doorways: [], sideHalves: [],
        rethemed: [], specialSmalls: [], mediums: [], mediumSkipped: [], flatShieldKept: [], flatShieldSwapped: [], levelled: [],
        novelAdded: [], novelReplaced: [], novelUnplaced: [], liftedLate: [] };
}

function snapshot(tree) {
    return { nodes: tree.nodes.length, edges: tree.edges.length, roles: options.roleShares(tree), openings: options.openingShares(tree),
        layout: layout.layoutSummary(tree), badBundles: badBundles(tree) };
}

function nodeTypes(tree) {
    return tree.nodes.reduce((counts, node) => ({ ...counts, [node.type]: (counts[node.type] || 0) + 1 }), {});
}

function badBundles(tree) {
    return visualBundleAudit(tree).bundles.filter(bundle => !bundle.hasFeature || bundle.interiorThemes > 1).length;
}

function rework(tree) {
    assert.notStrictEqual(tree.layoutRework, 'v23', '이미 v23 개편을 거친 원본입니다.');
    const report = newReport(), context = options.createContext(tree);
    options.refreshDistances(tree);
    polish.rethemeGenericDamage(tree, context, report);
    layout.scaleLayout(tree);
    layout.detachInlineNotables(tree, report);
    layout.addApproachNodes(tree, report, options.makeApproachStep(context));
    layout.relieveLinesOverNodes(tree, report);
    options.refreshDistances(tree);
    options.fillCentreEmpties(tree, report);
    options.replaceDeadStats(tree, report);
    options.roundOffStepValues(tree, report);
    options.purifyMixedNotables(tree, context, report);
    options.liftWeakFeatures(tree, context, report);
    options.promoteDeadEndLeaves(tree, context, report);
    options.themeAttackDoorways(tree, context, report);
    options.strengthenOpenings(tree, context, report);
    options.ensureFirstNotable(tree, context, report);
    options.refreshDistances(tree);
    polish.polishTree(tree, context, report);
    tree.layoutRework = 'v23';
    return report;
}

const specialTotals = tree => Object.fromEntries(SPECIAL_STATS.map(statId => [statId, tree.nodes.reduce((sum, node) =>
    sum + (node.runtimeEffects || []).filter(effect => effect.statId === statId).reduce((total, effect) => total + Number(effect.value), 0), 0)]));

/** No node gives more of a special than it gave before; a node that gave none may give only 1, as a single-option small node (순환 top-up). */
function assertNoSpecialMerge(source, tree) {
    const before = new Map(source.nodes.map(node => [String(node.id), node]));
    tree.nodes.forEach(node => (node.runtimeEffects || []).filter(effect => SPECIAL_STATS.includes(effect.statId)).forEach(effect => {
        const old = ((before.get(String(node.id)) || {}).runtimeEffects || []).find(entry => entry.statId === effect.statId);
        if (old) assert.ok(Number(effect.value) <= Number(old.value), `신비/계시/순환이 한 노드로 모였습니다: ${node.id}/${effect.statId}`);
        else assert.ok(polish.isSpecialSingle(node) && Number(effect.value) === 1, `새 신비/계시/순환 줄은 단일 소형 +1만 됩니다: ${node.id}`);
    }));
}

/** The polish contract: no plain 피해 outside rune nodes, flat energy shield rare and on medium nodes and notables only, the defence %
 * table everywhere, six single-option small nodes per special with no special merged into another node, and no crowded pair. */
function assertPolish(source, tree, before) {
    const effectsOf = node => node.runtimeEffects || [];
    const generic = tree.nodes.filter(node => effectsOf(node).some(effect => effect.statId === 'pctDmg')
        && !effectsOf(node).some(effect => options.roleOf(effect.statId) === 'P'));
    assert.deepStrictEqual(generic.map(node => node.id), [], '이름이나 구역과 맞지 않는 일반 피해가 남았습니다.');
    const flat = tree.nodes.filter(node => effectsOf(node).some(effect => effect.statId === 'energyShield'));
    assert.ok(flat.length <= FLAT_SHIELD_LIMIT && flat.every(node => ['normal', 'major'].includes(node.type)), `에너지 보호막 플랫이 ${flat.length}개입니다.`);
    tree.nodes.forEach(node => effectsOf(node).forEach((effect, index) => {
        if (!polish.DEFENCE_PERCENTS.has(effect.statId) || !polish.DEFENCE_PERCENT_BASE[node.type]) return;
        assert.strictEqual(Number(effect.value), polish.defencePercent(node, index), `방어 % 표와 다른 값: ${node.id}/${effect.statId}`);
    }));
    const singles = Object.fromEntries(SPECIAL_STATS.map(statId => [statId,
        tree.nodes.filter(node => polish.isSpecialSingle(node) && node.runtimeEffects[0].statId === statId).length]));
    SPECIAL_STATS.forEach(statId => assert.strictEqual(singles[statId], polish.SPECIAL_SMALLS_KEPT, `${statId} 단일 소형이 ${singles[statId]}개입니다.`));
    assertNoSpecialMerge(source, tree);
    const fourfold = tree.nodes.find(node => node.keystoneTemplateId === 'mystique_fourfold_unity');
    assert.ok(fourfold.desc.includes(`각각 ${polish.FOURFOLD_UNITY_MINIMUM} 이상이면`)
        && fs.readFileSync(`${__dirname}/../js/combat.js`, 'utf8').includes(`totalStrength >= ${polish.FOURFOLD_UNITY_MINIMUM} &&`),
        '사중합일 문턱이 설명과 js/combat.js에서 다릅니다.');
    assert.strictEqual(layout.layoutSummary(tree).crowdedPairs, 0, '붙어 보이는 노드가 생겼습니다.');
    return { generic: generic.length, flatShield: flat.length, specialSingles: singles, specialTotals: { before: specialTotals(source), after: specialTotals(tree) }, before };
}

function assertConnectedAndDistances(tree) {
    const graph = buildGraph(tree), starts = tree.nodes.filter(node => node.type === 'start').map(node => String(node.id));
    const distances = graphDistances(graph, starts);
    assert.strictEqual(distances.size, tree.nodes.length, '모든 노드가 직업 시작점과 이어져야 합니다.');
    tree.nodes.filter(node => ACTIONABLE.has(node.type)).forEach(node => {
        assert.strictEqual(node.distanceFromClassStart, distances.get(String(node.id)), `거리 기록 불일치: ${node.id}`);
        assert.strictEqual(node.powerBand, Math.min(4, Math.floor(node.distanceFromClassStart / 7)), `파워 구간 불일치: ${node.id}`);
    });
}

/** Special-stat nodes outside their zone (18 were already outside before v23; the rework may not add any). */
function specialStrays(tree, scale = 1) {
    return tree.nodes.filter(node => ['mystique', 'devotion', 'cycle'].includes(node.cat)
        && !isIntendedSpecial({ ...node, x: node.x * scale, y: node.y * scale })).map(node => String(node.id)).sort();
}

function assertEffects(source, tree) {
    tree.nodes.filter(node => ACTIONABLE.has(node.type)).forEach(node => {
        assert.ok(Array.isArray(node.runtimeEffects) && node.runtimeEffects.length > 0, `효과가 없는 노드: ${node.id}`);
        assert.ok(String(node.desc || '').trim(), `설명이 없는 노드: ${node.id}`);
        node.runtimeEffects.forEach(effect => {
            assert.ok(STAT_META[effect.statId], `런타임이 모르는 효과: ${node.id}/${effect.statId}`);
            assert.ok(Number.isFinite(Number(effect.value)) && Number(effect.value) !== 0, `잘못된 수치: ${node.id}/${effect.statId}`);
            assert.ok(isReadablePassiveValue(effect.statId, effect.value), `읽기 어려운 수치: ${node.id}/${effect.statId}/${effect.value}`);
        });
    });
    const known = new Set(specialStrays(source, layout.LAYOUT_SCALE));
    specialStrays(tree).forEach(id => assert.ok(known.has(id), `특수 스탯이 지정 구역을 새로 벗어남: ${id}`));
}

function assertStructure(source, tree) {
    const ids = new Set(tree.nodes.map(node => String(node.id)));
    assert.strictEqual(ids.size, tree.nodes.length, '노드 id가 겹칩니다.');
    source.nodes.forEach(node => assert.ok(ids.has(String(node.id)), `지워진 노드: ${node.id}`));
    const edgeKeys = new Set();
    tree.edges.forEach(edge => {
        const key = [String(edge.a), String(edge.b)].sort().join('|');
        assert.ok(ids.has(String(edge.a)) && ids.has(String(edge.b)) && edge.a !== edge.b, `잘못된 연결: ${key}`);
        assert.ok(!edgeKeys.has(key), `겹친 연결: ${key}`);
        edgeKeys.add(key);
    });
    const starts = tree.nodes.filter(node => node.type === 'start');
    assert.deepStrictEqual(starts.map(node => node.startClassId).sort(), [...CLASS_IDS].sort(), '직업 시작점 6개가 그대로여야 합니다.');
    tree.nodes.filter(node => ['start', 'void'].includes(node.type)).forEach(node =>
        assert.deepStrictEqual(node.runtimeEffects || [], [], `${node.id}: 시작점과 공허 노드는 고정 효과가 없어야 합니다.`));
    const hidden = edges => edges.filter(edge => edge.hidden).map(edge => [String(edge.a), String(edge.b)].sort().join('|')).sort();
    assert.deepStrictEqual(hidden(tree.edges), hidden(source.edges), '키스톤 전용 숨은 연결은 그대로여야 합니다.');
}

function assertDesign(tree, before) {
    const after = snapshot(tree);
    assert.ok(after.badBundles <= before.badBundles, `묶음 규칙 위반이 늘었습니다: ${before.badBundles} → ${after.badBundles}`);
    assert.ok(after.layout.linesOverNodes <= before.layout.linesOverNodes, '노드 위를 지나는 선이 늘었습니다.');
    assert.strictEqual(after.roles.mixedNotables, 0, '공격과 방어를 같이 주는 주요가 남았습니다.');
    Object.entries(after.openings).forEach(([classId, row]) => {
        assert.ok(row.firstAttackNotable <= 5, `${classId}: 첫 공격 주요가 5점 안에 없습니다.`);
        assert.ok(row.attack / row.nodes >= 0.4, `${classId}: 첫 다섯 칸의 공격 비율이 40% 아래입니다.`);
    });
    return after;
}

function main() {
    const [sourceFile, outputFile] = process.argv.slice(2);
    if (!sourceFile || !outputFile) throw new Error('사용법: node scripts/rework-passive-tree-v23.js <source.json> <output.json>');
    const source = readTree(sourceFile), tree = JSON.parse(JSON.stringify(source));
    const before = snapshot(tree), unitsContext = options.createContext(source);
    before.units = options.roleUnits(tree, unitsContext);
    before.types = nodeTypes(tree);
    const report = rework(tree);
    assertStructure(source, tree);
    assertConnectedAndDistances(tree);
    assertEffects(source, tree);
    const after = assertDesign(tree, before);
    after.polish = assertPolish(source, tree, before.types);
    after.units = options.roleUnits(tree, unitsContext);
    after.types = nodeTypes(tree);
    fs.writeFileSync(outputFile, `${JSON.stringify(tree, null, 2)}\n`);
    const counts = Object.fromEntries(Object.entries(report).map(([key, value]) => [key, Array.isArray(value) ? value.length : value]));
    console.log(JSON.stringify({ before, after, counts, skipped: { detach: report.detachSkipped, approach: report.approachSkipped.length,
        firstNotableMissing: report.firstNotableMissing } }, null, 2));
}

if (require.main === module) main();

module.exports = { rework, snapshot };
