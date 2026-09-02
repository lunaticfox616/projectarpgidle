#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { readTree } = require('./audit-passive-tree-source');
const { auditShortBranchChoices } = require('./lib/passive-tree-branch-choices');
const { MANUAL_MAJOR_DESIGNS } = require('./lib/passive-tree-major-design');
const { ATTRIBUTE_STATS, PATH_ALLOWED_STATS, classifyPassiveTreeTopology } = require('./lib/passive-tree-topology');

const SPECIAL_CATS = new Set(['mystique', 'devotion', 'cycle']);
const source = readTree('artifacts/passive-tree/260828_3passive-tree-corrected.json');
const output = readTree('artifacts/passive-tree/260828_3passive-tree-feature-effects.json');
const sourceById = new Map(source.nodes.map(node => [String(node.id), node]));
const outputById = new Map(output.nodes.map(node => [String(node.id), node]));
const topology = classifyPassiveTreeTopology(source);
const manualMajorIds = new Set(Object.keys(MANUAL_MAJOR_DESIGNS));
const authoredMajors = source.nodes.filter(node => node.type === 'major'
    && String(node.optionProfile || '').startsWith('authored:'));
assert.strictEqual(authoredMajors.length, 33, '수작업 주요 패시브 기준 수가 달라졌습니다.');
const preservedAuthoredMajors = authoredMajors.filter(node => {
    const id = String(node.id);
    const invalidCorridor = topology.corridorIds.has(id)
        && node.runtimeEffects.some(effect => !PATH_ALLOWED_STATS.has(effect.statId));
    return !invalidCorridor && !topology.reducedSpecialIds.has(id);
});
assert.strictEqual(preservedAuthoredMajors.length, 26, '보존 가능한 수작업 주요 패시브 수가 달라졌습니다.');
preservedAuthoredMajors.forEach(node => {
    if (manualMajorIds.has(String(node.id))) return;
    const result = outputById.get(String(node.id));
    assert.strictEqual(result.optionProfile, node.optionProfile,
        `수작업 주요 패시브 프로필이 자동 프로필로 덮였습니다: ${node.id}`);
    const resultStats = new Set(result.runtimeEffects.map(effect => effect.statId));
    node.runtimeEffects.forEach(effect => assert.ok(resultStats.has(effect.statId),
        `수작업 주요 패시브의 기존 효과가 사라졌습니다: ${node.id}/${effect.statId}`));
});
const preservedMajors = source.nodes.filter(node => {
    if (node.type !== 'major') return false;
    const id = String(node.id);
    const invalidCorridor = topology.corridorIds.has(id)
        && node.runtimeEffects.some(effect => !PATH_ALLOWED_STATS.has(effect.statId));
    return !invalidCorridor && !topology.reducedSpecialIds.has(id);
});
assert.strictEqual(preservedMajors.length, 134, '자동 재설계에서 제외할 기존 주요 패시브 수가 달라졌습니다.');
preservedMajors.forEach(node => {
    if (manualMajorIds.has(String(node.id))) return;
    const result = outputById.get(String(node.id));
    assert.strictEqual(result.name, node.name, `기존 주요 패시브 이름이 자동 프로필로 덮였습니다: ${node.id}`);
    assert.strictEqual(result.optionProfile, node.optionProfile,
        `기존 주요 패시브 프로필이 자동 프로필로 덮였습니다: ${node.id}`);
    const resultStats = new Set(result.runtimeEffects.map(effect => effect.statId));
    node.runtimeEffects.forEach(effect => assert.ok(resultStats.has(effect.statId),
        `기존 주요 패시브 효과 조합이 사라졌습니다: ${node.id}/${effect.statId}`));
});
Object.entries(MANUAL_MAJOR_DESIGNS).forEach(([id, design]) => {
    const node = outputById.get(id);
    assert.ok(node, `명시적으로 설계한 주요 패시브가 없습니다: ${id}`);
    assert.strictEqual(node.type, 'major', `명시적 주요 패시브의 등급이 달라졌습니다: ${id}`);
    assert.strictEqual(node.name, design.name, `명시적 주요 패시브 이름이 달라졌습니다: ${id}`);
    assert.strictEqual(node.optionProfile, `manual:${id}`, `명시적 주요 패시브가 자동 프로필로 덮였습니다: ${id}`);
    assert.deepStrictEqual(node.runtimeEffects.map(effect => [effect.statId, effect.value]), design.effects,
        `명시적 주요 패시브 효과가 달라졌습니다: ${id}`);
});
const majorNodes = output.nodes.filter(node => node.type === 'major');
assert.ok(majorNodes.every(node => node.runtimeEffects.length >= 2), '효과가 한 줄뿐인 주요 패시브가 남았습니다.');
assert.ok(majorNodes.every(node => node.runtimeEffects.every(effect => !ATTRIBUTE_STATS.has(effect.statId))),
    '주요 패시브 효과 조합에 힘·민첩·지능이 남았습니다.');
const majorEffectKeys = new Set(majorNodes.map(node => JSON.stringify(node.runtimeEffects.map(effect =>
    [effect.statId, effect.value]).sort())));
assert.ok(majorEffectKeys.size >= Math.ceil(majorNodes.length * 0.75),
    '주요 패시브 효과 조합이 다시 소수 프로필로 수렴했습니다.');
const nodesByCluster = new Map();
output.nodes.filter(node => node.optionClusterId).forEach(node => {
    if (!nodesByCluster.has(node.optionClusterId)) nodesByCluster.set(node.optionClusterId, []);
    nodesByCluster.get(node.optionClusterId).push(node);
});
majorNodes.forEach(node => node.runtimeEffects.filter(effect => Number(effect.value) > 0
    && !SPECIAL_CATS.has(effect.statId)).forEach(effect => {
    const lowerValues = (nodesByCluster.get(node.optionClusterId) || [])
        .filter(member => ['minor', 'assist', 'normal'].includes(member.type))
        .flatMap(member => member.runtimeEffects.filter(row => row.statId === effect.statId)
            .map(row => Number(row.value)));
    if (lowerValues.length === 0) return;
    assert.ok(Number(effect.value) > Math.max(...lowerValues),
        `주요 패시브가 같은 뭉치의 하위 등급보다 강하지 않습니다: ${node.id}/${effect.statId}`);
}));
assert.strictEqual(topology.backboneIds.size, 167, '직업 시작점-공허 능력치 뼈대 범위가 달라졌습니다.');
assert.strictEqual(topology.corridorIds.size, 1164, '노드 뭉치 사이 길목 범위가 달라졌습니다.');
assert.strictEqual(topology.bundleIds.size, 628, '실제 선택형 노드 뭉치 범위가 달라졌습니다.');
['nhenzv8gp4i', 'ndru1xggqhg', 'nlwk06igprm'].forEach(id => {
    assert.ok(topology.bundleIds.has(id), '지혜의 도약 뒤의 속성 선택지는 공용 길목이 아닙니다.');
    assert.ok(!topology.corridorIds.has(id), '히든 선택지를 길목 보정으로 일반 피해로 덮으면 안 됩니다.');
});
topology.backboneIds.forEach(id => {
    const before = sourceById.get(id), after = outputById.get(id);
    assert.deepStrictEqual(after.runtimeEffects, before.runtimeEffects, `뼈대 능력치 효과가 바뀌었습니다: ${id}`);
    assert.strictEqual(after.cat, before.cat, `뼈대 능력치 태그가 바뀌었습니다: ${id}`);
    assert.strictEqual(after.archetype, before.archetype, `뼈대 능력치 계열이 바뀌었습니다: ${id}`);
});

const sourceNeighbors = new Map(source.nodes.map(node => [String(node.id), new Set()]));
source.edges.forEach(edge => {
    sourceNeighbors.get(String(edge.a))?.add(String(edge.b));
    sourceNeighbors.get(String(edge.b))?.add(String(edge.a));
});
const bundleNodes = output.nodes.filter(node => node.expansionRole === 'backbone-bundle');
const standaloneKeystones = output.nodes.filter(node => node.expansionRole === 'keystone-destination');
assert.strictEqual(output.nodes.filter(node => String(node.id).startsWith('exp30_')).length, 0,
    '폐기하기로 한 1,000개 확장 노드가 남았습니다.');
assert.strictEqual(bundleNodes.length, 185, '서로 다른 30개 옵션 뭉치의 패시브 수가 달라졌습니다.');
assert.strictEqual(standaloneKeystones.length, 17, '신규 키스톤 종착점 수가 달라졌습니다.');
assert.strictEqual(output.nodes.length, source.nodes.length + 202, '폐기 후 추가되는 총 노드 수가 달라졌습니다.');
const sourceProfiles = new Set(bundleNodes.flatMap(node => node.sourceOptionProfiles || []));
assert.strictEqual(sourceProfiles.size, 100, '폐기한 확장 노드의 옵션 테마가 모두 보존되지 않았습니다.');
const bundleGroups = new Map();
bundleNodes.forEach(node => {
    if (!bundleGroups.has(node.expansionGroupId)) bundleGroups.set(node.expansionGroupId, new Set());
    bundleGroups.get(node.expansionGroupId).add(String(node.id));
});
assert.strictEqual(bundleGroups.size, 30, '직업 구역 24개와 중앙 6개 옵션 뭉치가 필요합니다.');
assert.strictEqual(new Set(bundleNodes.map(node => node.visualPattern)).size, 30,
    '30개 옵션 뭉치는 서로 다른 시각적 실루엣을 가져야 합니다.');
assert.strictEqual(new Set(bundleNodes.filter(node => node.expansionZone === 'class')
    .map(node => node.expansionGroupId)).size, 24, '직업 구역은 구역당 네 뭉치여야 합니다.');
assert.strictEqual(new Set(bundleNodes.filter(node => node.expansionZone === 'center')
    .map(node => node.expansionGroupId)).size, 6, '중앙 옵션 뭉치는 여섯 개여야 합니다.');
const usedAnchors = new Set();
bundleGroups.forEach((ids, groupId) => {
    assert.ok(ids.size >= 5 && ids.size <= 7, `옵션 뭉치 크기는 5~7개여야 합니다: ${groupId}`);
    const rootEdges = output.edges.filter(edge => ids.has(String(edge.a)) !== ids.has(String(edge.b))
        && (ids.has(String(edge.a)) || ids.has(String(edge.b))));
    assert.strictEqual(rootEdges.length, 1, `옵션 뭉치는 뼈대 길목 한 곳에만 연결되어야 합니다: ${groupId}`);
    const root = rootEdges[0], anchorId = ids.has(String(root.a)) ? String(root.b) : String(root.a);
    assert.ok(topology.corridorIds.has(anchorId), `옵션 뭉치가 빈 길목에 연결되지 않았습니다: ${groupId}`);
    assert.ok(![...(sourceNeighbors.get(anchorId) || [])].some(id => topology.bundleIds.has(id)),
        `이미 별도 노드 뭉치가 달린 뼈대 길목을 다시 사용했습니다: ${groupId}/${anchorId}`);
    assert.ok(!usedAnchors.has(anchorId), `둘 이상의 신규 뭉치가 같은 뼈대 길목을 공유합니다: ${anchorId}`);
    usedAnchors.add(anchorId);
});
const outputNeighbors = new Map(output.nodes.map(node => [String(node.id), new Set()]));
output.edges.forEach(edge => {
    outputNeighbors.get(String(edge.a))?.add(String(edge.b));
    outputNeighbors.get(String(edge.b))?.add(String(edge.a));
});
standaloneKeystones.forEach(node => {
    const neighbors = [...outputNeighbors.get(String(node.id))];
    assert.strictEqual(neighbors.length, 1, `신규 키스톤은 뭉치 밖의 1차 종착점이어야 합니다: ${node.id}`);
    assert.ok(topology.corridorIds.has(neighbors[0]), `신규 키스톤이 길목 종착점에 연결되지 않았습니다: ${node.id}`);
    const anchor = outputById.get(neighbors[0]);
    assert.ok(Math.hypot(node.x, node.y) >= Math.hypot(anchor.x, anchor.y) + 40,
        `신규 키스톤이 뭉치 안쪽에 배치되었습니다: ${node.id}`);
});

const expectedBackboneStats = {
    uniform_p030_05: ['intelligence', 5],
    pt_spine_warrior_left_05: ['strength', 5],
    uniform_p150_06: ['dexterity', 5],
    uniform_m150_10: ['dexterity', 5],
    n9gzp5qg2tu: ['intelligence', 5],
    uniform_m030_05: ['intelligence', 5]
};
Object.entries(expectedBackboneStats).forEach(([id, expected]) => {
    assert.ok(topology.backboneIds.has(id), `직업 시작점-공허 능력치 뼈대에서 누락되었습니다: ${id}`);
    assert.deepStrictEqual(outputById.get(id).runtimeEffects.map(effect => [effect.statId, effect.value]), [expected],
        `직업 시작점-공허 능력치 뼈대가 다른 효과로 바뀌었습니다: ${id}`);
});

['nslw2x9ika9', 'n7i69n7ii2u', 'nl2v55ifp2d', 'nfo0d4hg9l3'].forEach(id =>
    assert.ok(topology.corridorIds.has(id), `전사 시작점 앞 통과 길목에서 누락되었습니다: ${id}`));
['ngbx633pbqa', 'nxnum3flvwb'].forEach(id =>
    assert.ok(topology.bundleIds.has(id), `전사 시작점 앞 선택형 물리 뭉치에서 누락되었습니다: ${id}`));
topology.corridorIds.forEach(id => {
    const node = outputById.get(id);
    assert.ok((node.runtimeEffects || []).every(effect => PATH_ALLOWED_STATS.has(effect.statId)),
        `길목에 건너뛸 수 있는 빌드 전용 효과가 남았습니다: ${id}`);
});

assert.strictEqual(auditShortBranchChoices(output).count, 0, '하위 호환인 짧은 갈래가 남아 있습니다.');

source.nodes.filter(node => ['minor', 'assist'].includes(node.type) && SPECIAL_CATS.has(node.cat)).forEach(node => {
    const result = outputById.get(String(node.id));
    if (topology.preservedSpecialIds.has(String(node.id)) && topology.bundleIds.has(String(node.id))) {
        assert.deepStrictEqual(result, node, `지정 구역의 특수 스탯 패시브를 보존해야 합니다: ${node.id}`);
        return;
    }
    assert.ok(!SPECIAL_CATS.has(result.cat)
        && result.runtimeEffects.every(effect => !SPECIAL_CATS.has(effect.statId)),
    `지정 구역 밖 특수 스탯 패시브가 일반 뭉치 효과로 바뀌지 않았습니다: ${node.id}`);
});

output.nodes.filter(node => ['normal', 'major'].includes(node.type) && SPECIAL_CATS.has(node.cat)).forEach(node => {
    const sourceNode = sourceById.get(String(node.id));
    const preservedMajor = node.type === 'major' && sourceNode && preservedMajors.includes(sourceNode);
    if (preservedMajor && !node.specialVariation) return;
    const band = Math.max(0, Math.min(4, Number(node.powerBand) || 0));
    const expected = node.type === 'normal' ? [1, 1, 2, 2, 2][band] : [2, 2, 2, 3, 3][band];
    const expectedPrimary = node.specialVariation === 'gated-tradeoff' ? -1 : expected;
    assert.strictEqual(node.runtimeEffects.find(effect => effect.statId === node.cat)?.value, expectedPrimary,
        `특수 스탯 본체 수치가 거리 구간과 다릅니다: ${node.id}`);
});

const specialFeatures = output.nodes.filter(node => ['normal', 'major'].includes(node.type) && SPECIAL_CATS.has(node.cat));
assert.strictEqual(specialFeatures.filter(node => node.specialVariation === 'class-synergy').length, 4,
    '인접 직업 시너지 패시브 수가 달라졌습니다.');
assert.strictEqual(specialFeatures.filter(node => node.specialVariation === 'high-power-penalty').length, 3,
    '특수 스탯 +3 패널티 패시브 수가 달라졌습니다.');
assert.strictEqual(specialFeatures.filter(node => node.specialVariation === 'gated-tradeoff').length, 1,
    '특수 스탯 지불형 희소 패시브는 정확히 하나여야 합니다.');

['pt_base_path_004', 'n6u0tktgrnk'].forEach(id => assert.ok(sourceById.has(id) && outputById.has(id)));
assert.notDeepStrictEqual(outputById.get('pt_base_path_004').runtimeEffects, outputById.get('n6u0tktgrnk').runtimeEffects,
    '같은 병증 갈래의 한 포인트 선택지가 다시 같아졌습니다.');
assert.notDeepStrictEqual(outputById.get('v13_bulk_성직자_1_10').runtimeEffects,
    outputById.get('v13_bulk_성직자_1_11').runtimeEffects, '나란한 주요 패시브가 다시 같은 선택지가 되었습니다.');

console.log('smoke-passive-tree-branch-choices passed');
