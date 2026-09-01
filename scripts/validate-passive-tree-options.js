#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { ACTIONABLE_TYPES, zoneForPosition } = require('./complete-passive-tree-options');
const { buildGraph, graphDistances, isIntendedSpecial, readTree } = require('./audit-passive-tree-source');
const { STAT_META, isReadablePassiveValue } = require('./lib/passive-tree-option-catalog');
const { visualBundleAudit } = require('./lib/passive-tree-clusters');

const CLASS_IDS = new Set(['occultist', 'wanderer', 'cleric', 'archer', 'alchemist', 'warrior']);

function byId(tree) {
    return new Map(tree.nodes.map(node => [String(node.id), node]));
}

function assertLayoutChangesScoped(source, output) {
    const sourceById = byId(source), outputById = byId(output);
    const sourceCoordinateCounts = new Map();
    source.nodes.forEach(node => {
        const key = `${Number(node.x)}|${Number(node.y)}`;
        sourceCoordinateCounts.set(key, (sourceCoordinateCounts.get(key) || 0) + 1);
    });
    const removed = [...sourceById.keys()].filter(id => !outputById.has(id));
    assert.deepStrictEqual(removed, ['nq5bfx0tbfi'], '겹친 고립 노드 외에는 삭제하면 안 됩니다.');
    output.nodes.forEach(node => {
        const previous = sourceById.get(String(node.id));
        assert.ok(previous, `원본에 없는 정적 노드: ${node.id}`);
        const promoted = previous.type !== node.type && previous.type !== 'normal' && node.type === 'normal' && node.clusterPromoted;
        assert.ok(node.type === previous.type || promoted, `허용되지 않은 노드 종류 변경: ${node.id}`);
        if (Number(node.x) === Number(previous.x) && Number(node.y) === Number(previous.y)) return;
        const originalKey = `${Number(previous.x)}|${Number(previous.y)}`;
        const movedDistance = Math.hypot(Number(node.x) - Number(previous.x), Number(node.y) - Number(previous.y));
        assert.ok((sourceCoordinateCounts.get(originalKey) || 0) > 1 && movedDistance <= 80,
            `겹침 분리 범위를 벗어난 노드 배치 변경: ${node.id}`);
    });
    const sourceEdges = new Set(source.edges.map(edge => [String(edge.a), String(edge.b)].sort().join('|')));
    const outputEdges = new Set(output.edges.map(edge => [String(edge.a), String(edge.b)].sort().join('|')));
    sourceEdges.forEach(edge => assert.ok(outputEdges.has(edge), `원본 연결선 누락: ${edge}`));
    assert.strictEqual(outputEdges.size, sourceEdges.size + 1, '고립 노드 복구 연결선만 하나 추가되어야 합니다.');
}

function assertStructuralContracts(tree) {
    const starts = tree.nodes.filter(node => node.type === 'start');
    assert.strictEqual(starts.length, 6, '직업 시작점은 6개여야 합니다.');
    assert.deepStrictEqual(new Set(starts.map(node => node.startClassId)), CLASS_IDS, '6직업 시작점 매핑이 올바르지 않습니다.');
    starts.forEach(node => assert.deepStrictEqual(node.runtimeEffects, [], `${node.name} 시작점은 효과가 없어야 합니다.`));
    tree.nodes.filter(node => node.type === 'void').forEach(node =>
        assert.deepStrictEqual(node.runtimeEffects, [], `${node.id} 공허 노드는 제작 전 고정 효과가 없어야 합니다.`));
    const sockets = tree.nodes.filter(node => node.type === 'quatrefoil');
    assert.strictEqual(sockets.filter(node => node.starWedgeMode === 'mutation').length, 3, '중앙 성률은 3개여야 합니다.');
    assert.strictEqual(sockets.filter(node => node.starWedgeMode === 'constellation').length, 6, '외곽 성률은 6개여야 합니다.');
}

function assertEffectsComplete(tree) {
    tree.nodes.filter(node => ACTIONABLE_TYPES.has(node.type)).forEach(node => {
        assert.ok(Array.isArray(node.runtimeEffects) && node.runtimeEffects.length > 0, `효과가 없는 노드: ${node.id}`);
        assert.ok(String(node.name || '').trim() && String(node.desc || '').trim(), `이름/설명이 없는 노드: ${node.id}`);
        node.runtimeEffects.forEach(effect => {
            assert.ok(STAT_META[effect.statId], `런타임이 모르는 효과: ${node.id}/${effect.statId}`);
            assert.ok(Number.isFinite(Number(effect.value)), `숫자가 아닌 효과: ${node.id}/${effect.statId}`);
            assert.ok(isReadablePassiveValue(effect.statId, effect.value), `읽기 어려운 수치: ${node.id}/${effect.statId}/${effect.value}`);
        });
        if (['mystique', 'devotion', 'cycle'].includes(node.cat)) {
            assert.ok(isIntendedSpecial(node), `특수 스탯이 지정 구역을 벗어남: ${node.id}/${node.cat}`);
        }
    });
}

function assertClusterContracts(tree) {
    const audit = visualBundleAudit(tree);
    audit.bundles.forEach(bundle => {
        assert.ok(bundle.hasFeature, `일반/주요 패시브가 없는 노드 뭉치: ${bundle.ids.join(',')}`);
        assert.ok(bundle.interiorThemes <= 1, `한 노드 뭉치에 서로 다른 계열이 섞였습니다: ${bundle.ids.join(',')}`);
    });
}

function assertGraphAndDistance(tree) {
    const graph = buildGraph(tree), startIds = tree.nodes.filter(node => node.type === 'start').map(node => String(node.id));
    const distances = graphDistances(graph, startIds);
    assert.strictEqual(distances.size, tree.nodes.length, '모든 노드가 적어도 한 직업 시작점과 연결되어야 합니다.');
    tree.nodes.filter(node => ACTIONABLE_TYPES.has(node.type) && Number.isFinite(node.distanceFromClassStart)).forEach(node => {
        assert.strictEqual(node.distanceFromClassStart, distances.get(String(node.id)), `거리 기록 불일치: ${node.id}`);
        assert.strictEqual(node.powerBand, Math.min(4, Math.floor(node.distanceFromClassStart / 7)), `파워 구간 불일치: ${node.id}`);
    });
}

function assertChoiceAndHiddenRoutes(tree) {
    const wisdom = tree.nodes.find(node => node.name === '지혜의 도약');
    const covenant = tree.nodes.find(node => node.name === '헌신의 서약');
    assert.deepStrictEqual(wisdom.choiceGroup.options, ['fire', 'cold', 'lightning', 'chaos'], '지혜의 도약 선택지가 올바르지 않습니다.');
    assert.deepStrictEqual(covenant.hiddenRouteNodeIds, [], '헌신의 서약이 기존 능력치 노드를 숨기면 안 됩니다.');
    assert.ok(tree.nodes.every(node => String(node.hiddenByKeystoneId || '') !== String(covenant.id)),
        '헌신의 서약 주변 능력치 노드는 처음부터 보여야 합니다.');
    const bridgeEdges = tree.edges.filter(edge => edge.hidden
        && [String(edge.a), String(edge.b)].includes(String(covenant.id)));
    assert.ok(bridgeEdges.length > 0, '헌신의 서약 전용 능력치 연결선이 없습니다.');
    const nodeMap = byId(tree);
    bridgeEdges.forEach(edge => {
        const otherId = String(edge.a) === String(covenant.id) ? String(edge.b) : String(edge.a);
        const other = nodeMap.get(otherId);
        assert.ok(other && ['str', 'dex', 'int'].includes(other.cat), `서약 전용 다리의 대상이 능력치 노드가 아닙니다: ${otherId}`);
    });
}

function branchDiversity(tree) {
    const graph = buildGraph(tree), nodeMap = byId(tree);
    const forks = tree.nodes.filter(node => (graph.get(String(node.id)) || []).length >= 3);
    const diverse = forks.filter(node => {
        const neighbors = (graph.get(String(node.id)) || []).map(id => nodeMap.get(id)).filter(entry => ACTIONABLE_TYPES.has(entry.type));
        return neighbors.length < 3 || new Set(neighbors.map(entry => entry.optionProfile || entry.name)).size >= 2;
    });
    return { forks: forks.length, diverse: diverse.length, ratio: forks.length ? diverse.length / forks.length : 1 };
}

function summary(tree) {
    const diversity = branchDiversity(tree);
    return {
        nodes: tree.nodes.length, edges: tree.edges.length,
        types: Object.fromEntries([...new Set(tree.nodes.map(node => node.type))].sort()
            .map(type => [type, tree.nodes.filter(node => node.type === type).length])),
        special: Object.fromEntries(['mystique', 'devotion', 'cycle'].map(cat =>
            [cat, tree.nodes.filter(node => node.cat === cat).length])),
        zones: Object.fromEntries(Object.keys(ZONE_PALETTES_SAFE()).map(zone =>
            [zone, tree.nodes.filter(node => ACTIONABLE_TYPES.has(node.type) && zoneForPosition(node.x, node.y) === zone).length])),
        branchDiversity: { forks: diversity.forks, diverse: diversity.diverse, ratio: Number(diversity.ratio.toFixed(3)) }
    };
}

function ZONE_PALETTES_SAFE() {
    return { archer: true, alchemist: true, occultist: true, cleric: true, warrior: true, wanderer: true };
}

function main() {
    const [sourceFile, outputFile] = process.argv.slice(2);
    if (!sourceFile || !outputFile) throw new Error('사용법: node scripts/validate-passive-tree-options.js <source.json> <output.json>');
    const source = readTree(sourceFile), output = readTree(outputFile);
    assertLayoutChangesScoped(source, output);
    assertStructuralContracts(output);
    assertEffectsComplete(output);
    assertClusterContracts(output);
    assertGraphAndDistance(output);
    assertChoiceAndHiddenRoutes(output);
    const diversity = branchDiversity(output);
    assert.ok(diversity.ratio >= 0.7, `갈래길 효과 다양성이 부족합니다: ${(diversity.ratio * 100).toFixed(1)}%`);
    console.log(JSON.stringify(summary(output), null, 2));
}

main();
