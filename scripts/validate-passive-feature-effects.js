#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { readTree } = require('./audit-passive-tree-source');
const {
    designFeatureEffects, hasPreferredFeatureProfile, secondaryFeatureFamilies
} = require('./design-passive-feature-effects');
const { auditShortBranchChoices } = require('./lib/passive-tree-branch-choices');
const {
    FEATURE_EFFECT_PROFILES, RARE_MAJOR_EFFECTS, isCleanFeaturePassiveValue
} = require('./lib/passive-tree-feature-catalog');
const { CENTRAL_VOID_NO_EFFECT_NODE_IDS, hasNoEffects } = require('./lib/passive-tree-intent');
const { isAllAttributesEffects } = require('./lib/passive-tree-option-catalog');
const {
    ATTRIBUTE_STATS, PATH_ALLOWED_STATS, SPECIAL_CATEGORIES, classifyPassiveTreeTopology
} = require('./lib/passive-tree-topology');

const FEATURE_TYPES = new Set(['normal', 'major']);
const SMALL_TYPES = new Set(['minor', 'assist']);

function effectSignature(node) {
    return (node.runtimeEffects || []).map(effect => `${effect.statId}:${effect.value}`).sort().join('|');
}

function assertPassiveGradeContract(tree) {
    tree.nodes.filter(node => SMALL_TYPES.has(node.type)).forEach(node => {
        const count = (node.runtimeEffects || []).length;
        if (node.intentionalNoEffect) return assert.strictEqual(count, 0, `무효 패시브에 효과가 있습니다: ${node.id}`);
        if (['mystique', 'devotion', 'cycle'].includes(node.cat)) return;
        assert.ok(count === 1 || isAllAttributesEffects(node.runtimeEffects), `소형 패시브가 복합 효과를 가집니다: ${node.id}`);
    });
    tree.nodes.filter(node => node.type === 'normal').forEach(node =>
        assert.ok((node.runtimeEffects || []).length >= 2, `일반 패시브는 2줄 이상이어야 합니다: ${node.id}`));
    tree.nodes.filter(node => node.type === 'major').forEach(node =>
        assert.ok((node.runtimeEffects || []).length >= 2, `주요 패시브는 2줄 이상이어야 합니다: ${node.id}`));
    tree.nodes.filter(node => node.type === 'keystone').forEach(node => {
        assert.strictEqual((node.runtimeEffects || []).length, 0, `키스톤을 일반 수치 노드로 처리했습니다: ${node.id}`);
        assert.ok(node.keystoneEffectId && String(node.desc || '').trim(), `키스톤 기믹 정의가 없습니다: ${node.id}`);
    });
}

function assertHigherGradesOutrankCluster(tree) {
    const groups = new Map();
    tree.nodes.forEach(node => {
        if (!node.optionClusterId) return;
        if (!groups.has(node.optionClusterId)) groups.set(node.optionClusterId, []);
        groups.get(node.optionClusterId).push(node);
    });
    groups.forEach(nodes => nodes.filter(node => FEATURE_TYPES.has(node.type)).forEach(node => {
        const lowerTypes = node.type === 'normal' ? SMALL_TYPES : new Set([...SMALL_TYPES, 'normal']);
        const lowerNodes = nodes.filter(member => lowerTypes.has(member.type));
        (node.runtimeEffects || []).filter(effect => Number(effect.value) >= 0
            && !['mystique', 'devotion', 'cycle'].includes(effect.statId)).forEach(effect => {
            const values = lowerNodes.flatMap(member => member.runtimeEffects || [])
                .filter(lower => lower.statId === effect.statId && Number(lower.value) >= 0)
                .map(lower => Number(lower.value));
            if (values.length === 0) return;
            assert.ok(Number(effect.value) > Math.max(...values),
                `상위 패시브 수치가 하위 등급보다 낮습니다: ${node.id}/${effect.statId}`);
        });
    }));
}

function assertSpecialStatsAreIntegers(tree) {
    const specialStats = new Set(['mystique', 'devotion', 'cycle']);
    tree.nodes.forEach(node => (node.runtimeEffects || []).filter(effect => specialStats.has(effect.statId))
        .forEach(effect => assert.ok(Number.isInteger(Number(effect.value)),
            `특수 스탯에 소수점 수치가 남았습니다: ${node.id}/${effect.statId}/${effect.value}`)));
}

function assertGeneratedFeatureValuesAreClean(tree) {
    tree.nodes.filter(node => FEATURE_TYPES.has(node.type)
        && String(node.optionProfile || '').startsWith('feature:')).forEach(node => {
        (node.runtimeEffects || []).forEach(effect => assert.ok(
            isCleanFeaturePassiveValue(effect.statId, effect.value, node.type),
            `특징 패시브에 읽기 불편한 수치가 남았습니다: ${node.id}/${effect.statId}/${effect.value}`
        ));
    });
}

function assertOrdinarySmallValuesAreClean(tree) {
    tree.nodes.filter(node => SMALL_TYPES.has(node.type)
        && !['mystique', 'devotion', 'cycle'].includes(node.cat)).forEach(node => {
        (node.runtimeEffects || []).forEach(effect => assert.ok(
            isCleanFeaturePassiveValue(effect.statId, effect.value, node.type),
            `소형 패시브에 읽기 불편한 수치가 남았습니다: ${node.id}/${effect.statId}/${effect.value}`
        ));
    });
}

function assertClusterChoices(tree) {
    const groups = new Map();
    tree.nodes.filter(node => FEATURE_TYPES.has(node.type)).forEach(node => {
        const key = `${node.optionClusterId}:${node.archetype}:${node.type}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(node);
    });
    groups.forEach(nodes => {
        const signatures = nodes.map(effectSignature);
        assert.strictEqual(new Set(signatures).size, signatures.length,
            `같은 뭉치의 ${nodes[0].archetype} 선택지가 중복됩니다: ${nodes.map(node => node.id).join(',')}`);
    });
}

function assertProfileCatalogContract(tree) {
    tree.nodes.filter(node => FEATURE_TYPES.has(node.type) && String(node.optionProfile || '').startsWith('feature:'))
        .forEach(node => {
            const archetype = node.effectArchetype || node.archetype;
            const profiles = FEATURE_EFFECT_PROFILES[archetype]?.[node.type] || [];
            const profileId = String(node.optionProfile).slice('feature:'.length);
            assert.ok(profiles.some(profile => profile.id === profileId),
                `효과 태그와 프로필이 어긋납니다: ${node.id}/${archetype}/${profileId}`);
        });
}

function assertSpecializedCombatOptions(source, tree, topologyChangeIds, topology) {
    const outputById = new Map(tree.nodes.map(node => [String(node.id), node]));
    const hints = [
        { archetype: 'physical', pattern: /격돌|진동|충격/, statId: 'slamPctDmg' },
        { archetype: 'dexterity', pattern: /발놀림|몸놀림/, statId: 'mobilityPctDmg' },
        { archetype: 'spell', pattern: /유지|채널/, statId: 'channelingPctDmg' }
    ];
    hints.forEach(hint => source.nodes.filter(node => FEATURE_TYPES.has(node.type)
        && node.archetype === hint.archetype && hint.pattern.test(String(node.name || ''))
        && !topology.corridorIds.has(String(node.id))
        && !topologyChangeIds.has(String(node.id))).forEach(node => {
        const output = outputById.get(String(node.id));
        assert.ok(output.runtimeEffects.some(effect => effect.statId === hint.statId),
            `이름에 드러난 공격 특화 효과가 누락되었습니다: ${node.id}/${hint.statId}`);
    }));
    const summonNodes = tree.nodes.filter(node => node.effectArchetype === 'summon');
    assert.ok(summonNodes.length >= 2, '소환수 전용 주요 패시브가 사라졌습니다.');
    assert.strictEqual(new Set(summonNodes.map(effectSignature)).size, summonNodes.length,
        '소환수 주요 패시브가 같은 선택지로 겹칩니다.');
    summonNodes.forEach(node => {
        assert.strictEqual(node.type, 'major', `소환수 전용 패시브 등급이 달라졌습니다: ${node.id}`);
        assert.ok(node.runtimeEffects.every(effect => String(effect.statId).startsWith('summon')),
            `소환수 전용 패시브에 무관한 효과가 섞였습니다: ${node.id}`);
    });
}

function assertFeatureThemeCoherence(source, tree, branchChangedIds, topologyChangeIds, topology) {
    const outputById = new Map(tree.nodes.map(node => [String(node.id), node]));
    source.nodes.filter(node => FEATURE_TYPES.has(node.type)
        && !['mystique', 'devotion', 'cycle'].includes(node.cat)
        && !(node.runtimeEffects || []).some(effect => Number(effect.value) < 0)
        && !hasPreferredFeatureProfile(node)
        && !topology.corridorIds.has(String(node.id))
        && !topologyChangeIds.has(String(node.id))
        && !branchChangedIds.has(String(node.id))).forEach(node => {
        const output = outputById.get(String(node.id));
        if (output.effectArchetype === 'summon') return;
        const expected = secondaryFeatureFamilies(node);
        if (expected.size === 0) return;
        const actual = secondaryFeatureFamilies(output);
        assert.ok([...expected].some(family => actual.has(family)),
            `원래 뭉치 주제와 무관한 효과로 바뀌었습니다: ${node.id}`);
    });
}

function assertTopologyRoleContract(source, tree) {
    const topology = classifyPassiveTreeTopology(tree), sourceTopology = classifyPassiveTreeTopology(source);
    const actionable = tree.nodes.filter(node => ['minor', 'assist', 'normal', 'major'].includes(node.type));
    const bundleAttributes = actionable.filter(node => topology.bundleIds.has(String(node.id))
        && !SPECIAL_CATEGORIES.has(node.cat)
        && (node.runtimeEffects || []).some(effect => ATTRIBUTE_STATS.has(effect.statId)));
    assert.deepStrictEqual(bundleAttributes, [], '노드 뭉치에 일반 능력치가 남았습니다.');
    const invalidPathNodes = actionable.filter(node => topology.corridorIds.has(String(node.id))
        && (node.runtimeEffects || []).some(effect => !PATH_ALLOWED_STATS.has(effect.statId)));
    assert.deepStrictEqual(invalidPathNodes, [], '노드 뭉치 사이 길목에 빌드 전용 효과가 남았습니다.');
    const misplacedSpecial = actionable.filter(node => SPECIAL_CATEGORIES.has(node.cat)
        && !sourceTopology.preservedSpecialIds.has(String(node.id)));
    assert.deepStrictEqual(misplacedSpecial, [], '홀수 시계 구역 밖에 특수 스탯 뭉치가 남았습니다.');
    const sourceSpecial = source.nodes.filter(node => SPECIAL_CATEGORIES.has(node.cat)).length;
    const outputSpecial = tree.nodes.filter(node => SPECIAL_CATEGORIES.has(node.cat)).length;
    assert.ok(outputSpecial < sourceSpecial * 0.6, `특수 스탯이 충분히 줄지 않았습니다: ${sourceSpecial} -> ${outputSpecial}`);
    const bundleStats = new Set(actionable.filter(node => topology.bundleIds.has(String(node.id)))
        .flatMap(node => node.runtimeEffects || []).map(effect => effect.statId));
    assert.ok(bundleStats.size >= 30, `뭉치 효과의 종류가 부족합니다: ${bundleStats.size}`);
}

function assertRareEffects(tree) {
    const expected = new Set(Object.keys(RARE_MAJOR_EFFECTS));
    const rareStats = new Set(['suppCap', 'chaosGemLevel', 'projectileExtraShots', 'gemLevel', 'summonGemLevel']);
    const actual = tree.nodes.filter(node => (node.runtimeEffects || []).some(effect => rareStats.has(effect.statId)));
    assert.deepStrictEqual(new Set(actual.map(node => String(node.id))), expected, '희소 효과 배치가 달라졌습니다.');
    actual.forEach(node => assert.strictEqual(node.type, 'major', `희소 효과가 주요 노드가 아닙니다: ${node.id}`));
}

function assertEndpointBranchesHaveFeature(tree) {
    const nodes = new Map(tree.nodes.map(node => [String(node.id), node]));
    const adjacency = new Map([...nodes.keys()].map(id => [id, []]));
    tree.edges.forEach(edge => {
        adjacency.get(String(edge.a)).push(String(edge.b));
        adjacency.get(String(edge.b)).push(String(edge.a));
    });
    tree.nodes.filter(node => ['minor', 'assist'].includes(node.type)
        && adjacency.get(String(node.id)).length === 1).forEach(endpoint => {
        let currentId = String(endpoint.id), previousId = null, hasFeature = false;
        while (currentId) {
            const current = nodes.get(currentId);
            if (FEATURE_TYPES.has(current.type)) {
                hasFeature = true;
                break;
            }
            const nextIds = adjacency.get(currentId).filter(id => id !== previousId);
            if (nextIds.length !== 1) break;
            previousId = currentId;
            currentId = nextIds[0];
        }
        assert.ok(hasFeature, `특징 노드 없이 끝나는 소형 갈래가 남았습니다: ${endpoint.id}`);
    });
}

function assertIntentionalNoEffectPassives(tree) {
    const nodes = new Map(tree.nodes.map(node => [String(node.id), node]));
    CENTRAL_VOID_NO_EFFECT_NODE_IDS.forEach(id => {
        const node = nodes.get(id);
        assert.ok(node?.intentionalNoEffect, `중앙 무효 패시브 표식이 없습니다: ${id}`);
        assert.ok(hasNoEffects(node), `중앙 무효 패시브에 효과가 있습니다: ${id}`);
    });
}

function main() {
    const [sourceFile, outputFile] = process.argv.slice(2);
    if (!sourceFile || !outputFile) {
        throw new Error('사용법: node scripts/validate-passive-feature-effects.js <source.json> <output.json>');
    }
    const source = readTree(sourceFile), output = readTree(outputFile);
    const designed = designFeatureEffects(source, sourceFile), expected = designed.output;
    const topologyChangeIds = new Set(designed.report.topology.changes.map(change => change.id));
    const topology = classifyPassiveTreeTopology(source);
    assert.deepStrictEqual(output, expected, '설계 스크립트로 재생성한 결과와 출력 파일이 다릅니다.');
    assertClusterChoices(output);
    assertProfileCatalogContract(output);
    assertSpecializedCombatOptions(source, output, topologyChangeIds, topology);
    assertFeatureThemeCoherence(source, output, new Set(designed.report.branchChoices.changes
        .filter(change => FEATURE_TYPES.has(change.type)).map(change => change.id)), topologyChangeIds, topology);
    assertTopologyRoleContract(source, output);
    assertEndpointBranchesHaveFeature(output);
    assertRareEffects(output);
    assertIntentionalNoEffectPassives(output);
    assertPassiveGradeContract(output);
    assertHigherGradesOutrankCluster(output);
    assertSpecialStatsAreIntegers(output);
    assertGeneratedFeatureValuesAreClean(output);
    assertOrdinarySmallValuesAreClean(output);
    assert.strictEqual(auditShortBranchChoices(output).count, 0, '지배당한 짧은 갈래 선택지가 남았습니다.');
    const features = output.nodes.filter(node => FEATURE_TYPES.has(node.type));
    console.log(JSON.stringify({
        nodes: output.nodes.length, edges: output.edges.length, featureNodes: features.length,
        normal: features.filter(node => node.type === 'normal').length,
        major: features.filter(node => node.type === 'major').length,
        small: output.nodes.filter(node => SMALL_TYPES.has(node.type)).length,
        keystone: output.nodes.filter(node => node.type === 'keystone').length,
        dominatedShortBranches: 0,
        rareMajorNodes: Object.keys(RARE_MAJOR_EFFECTS).length,
        intentionalNoEffectPassives: CENTRAL_VOID_NO_EFFECT_NODE_IDS.length
    }, null, 2));
}

main();
