#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { completeTreeData } = require('./complete-passive-tree-options');
const { isIntendedSpecial } = require('./audit-passive-tree-source');
const { isReadablePassiveValue } = require('./lib/passive-tree-option-catalog');
const { visualBundleAudit } = require('./lib/passive-tree-clusters');

const STARTS = [
    ['occult-start', '비술사', 900, -520], ['wanderer-start', '방랑자', -900, 520],
    ['cleric-start', '성직자', 900, 520], ['warrior-start', '전사', 0, 1040],
    ['alchemist-start', '연금술사', 0, -1040], ['archer-start', '궁수', -900, -520]
];

function node(id, type, x, y, cat = 'none', options = {}) {
    return { id, type, x, y, cat, name: '', desc: '', mods: [], statAutoName: true, ...options };
}

function sampleTree() {
    const starts = STARTS.map(([id, name, x, y]) => node(id, 'start', x, y, 'none', { name, statAutoName: false }));
    const paths = STARTS.map(([id, , x, y], index) => node(`path-${index}`, index % 2 ? 'assist' : 'minor', x * 0.72, y * 0.72,
        index === 1 ? 'mystique' : ['int', 'dex', 'str', 'atk', 'ailment', 'def'][index]));
    const sockets = [node('center-a', 'quatrefoil', -100, -100), node('center-b', 'quatrefoil', 100, -100),
        node('center-c', 'quatrefoil', 0, 140)].concat(STARTS.map(([id, , x, y]) => node(`outer-${id}`, 'quatrefoil', x * 1.25, y * 1.25)));
    const keystones = [node('wisdom', 'keystone', 300, -100, 'int', { name: '지혜의 도약', desc: '원소 선택' }),
        node('covenant', 'keystone', 300, 100, 'devotion', { name: '헌신의 서약', desc: '히든 경로' })];
    const center = node('center', 'major', 0, 0, 'devotion');
    const requiredBuildMajors = [
        node('chaos-major', 'major', 620, -360, 'chaos'),
        node('spell-major', 'major', 540, -160, 'spell')
    ];
    const physicalAnchor = node('physical-anchor', 'normal', 260, 0, 'physical');
    const mixedRing = [
        node('ring-a', 'minor', 320, -60, 'mystique'), node('ring-b', 'minor', 380, 0, 'cycle'),
        node('ring-c', 'minor', 320, 60, 'int'), physicalAnchor
    ];
    const featurelessRing = [node('outer-ring-a', 'minor', 1350, 500, 'physical'),
        node('outer-ring-b', 'minor', 1410, 560, 'dex'), node('outer-ring-c', 'minor', 1350, 620, 'int')];
    const nodes = starts.concat(paths, sockets, keystones, center, requiredBuildMajors, mixedRing, featurelessRing,
        node('void', 'void', -300, 0));
    const edges = [];
    starts.forEach((start, index) => edges.push({ a: start.id, b: paths[index].id }, { a: paths[index].id, b: center.id }));
    sockets.forEach(socket => edges.push({ a: socket.id, b: center.id }));
    keystones.forEach(keystone => edges.push({ a: keystone.id, b: center.id }));
    requiredBuildMajors.forEach(major => edges.push({ a: major.id, b: center.id }));
    edges.push({ a: 'physical-anchor', b: 'ring-a' }, { a: 'ring-a', b: 'ring-b' }, { a: 'ring-b', b: 'ring-c' },
        { a: 'ring-c', b: 'physical-anchor' }, { a: 'physical-anchor', b: 'center' });
    edges.push({ a: 'outer-ring-a', b: 'outer-ring-b' }, { a: 'outer-ring-b', b: 'outer-ring-c' },
        { a: 'outer-ring-c', b: 'outer-ring-a' }, { a: 'outer-ring-a', b: 'outer-occult-start' });
    edges.push({ a: 'void', b: 'center' });
    return { statsSchemaVersion: 5, nodes, edges, allocated: [] };
}

function byId(tree, id) {
    return tree.nodes.find(node => node.id === id);
}

function main() {
    const source = sampleTree(), first = completeTreeData(source, 'fixture.json'), second = completeTreeData(source, 'fixture.json');
    assert.deepStrictEqual(first, second, '같은 입력은 같은 완성본을 만들어야 합니다.');
    STARTS.forEach(([id, , , , classId]) => {
        assert.deepStrictEqual(byId(first.tree, id).runtimeEffects, [], '시작점에는 효과가 없어야 합니다.');
        void classId;
    });
    assert.strictEqual(first.tree.nodes.filter(node => node.starWedgeMode === 'mutation').length, 3, '중앙 성률 분류 실패');
    const outerSockets = first.tree.nodes.filter(node => node.starWedgeMode === 'constellation');
    assert.strictEqual(outerSockets.length, 6, '외곽 성률 분류 실패');
    assert.strictEqual(new Set(outerSockets.map(node => node.name)).size, 6, '여섯 직업의 외곽 성률 이름은 서로 달라야 합니다.');
    assert.ok(byId(first.tree, 'wisdom').choiceGroup.options.includes('chaos'), '선택형 키스톤 설정 실패');
    assert.deepStrictEqual(byId(first.tree, 'covenant').hiddenRouteNodeIds, [],
        '헌신의 서약이 일반 길목 노드를 임의로 숨기면 안 됩니다.');
    assert.ok(first.tree.nodes.every(entry => entry.hiddenByKeystoneId !== 'covenant'),
        '헌신의 서약과 연결된 기존 능력치 노드는 항상 보여야 합니다.');
    const corrected = byId(first.tree, 'path-1');
    assert.notStrictEqual(corrected.cat, 'mystique', '지정 구역 밖 신비 노드는 일반 테마로 교정되어야 합니다.');
    first.tree.nodes.filter(node => ['mystique', 'devotion', 'cycle'].includes(node.cat)).forEach(node =>
        assert.ok(isIntendedSpecial(node), `특수 스탯 구역 이탈: ${node.id}`));
    assert.ok(first.tree.nodes.filter(node => ['minor', 'assist', 'normal', 'major'].includes(node.type))
        .every(node => node.runtimeEffects.length > 0), '일반 노드 효과가 비어서는 안 됩니다.');
    assert.ok(byId(first.tree, 'chaos-major').runtimeEffects.some(effect => effect.statId === 'chaosGemLevel'),
        '카오스 주요 노드에는 카오스 젬 레벨 선택지가 있어야 합니다.');
    assert.ok(byId(first.tree, 'spell-major').runtimeEffects.some(effect => effect.statId === 'suppCap'),
        '주문 주요 노드에는 보조 젬 한도 선택지가 있어야 합니다.');
    assert.strictEqual(first.tree.nodes.filter(node => node.clusterPromoted).length, 1,
        '주요/일반 패시브가 없는 독립 뭉치에는 일반 패시브를 하나 배치해야 합니다.');
    const audit = visualBundleAudit(first.tree);
    assert.ok(audit.bundles.every(bundle => bundle.hasFeature && bundle.interiorThemes <= 1),
        '노드 뭉치는 하나의 계열과 적어도 하나의 일반/주요 패시브를 가져야 합니다.');
    first.tree.nodes.flatMap(entry => entry.runtimeEffects || []).forEach(effect =>
        assert.ok(isReadablePassiveValue(effect.statId, effect.value), `읽기 어려운 패시브 수치: ${effect.statId}/${effect.value}`));
    const branchProfiles = ['ring-a', 'ring-c'].map(id => byId(first.tree, id).optionProfile);
    assert.strictEqual(new Set(branchProfiles).size, 2, '같은 목표로 향하는 갈래길에는 서로 다른 옵션을 배치해야 합니다.');
    console.log('passive tree option completion smoke test passed');
}

main();
