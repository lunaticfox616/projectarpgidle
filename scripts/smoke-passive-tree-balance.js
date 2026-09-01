#!/usr/bin/env node
'use strict';

const assert = require('assert');
const vm = require('vm');
const { buildGraph, graphDistances, readTree } = require('./audit-passive-tree-source');
const { ARCHETYPE_PROFILES, passiveValueStep } = require('./lib/passive-tree-option-catalog');
const { classifyPassiveTreeTopology } = require('./lib/passive-tree-topology');
const { buildGameRuntime } = require('./lib/game-runtime');

const ACTIONABLE_TYPES = new Set(['minor', 'assist', 'normal', 'major']);
const SPECIAL_ARCHETYPES = new Set(['mystique', 'devotion', 'cycle']);
const LEGACY_TIER_KEY = Object.freeze({ minor: 's', assist: 's', normal: 'm', major: 'k' });
const STAGES = Object.freeze({ early: 6, middle: 14, late: 28 });
const CLASS_STATS = Object.freeze({
    occultist: {
        offense: ['spellPctDmg', 'chaosPctDmg', 'summonPctDmg', 'dotPctDmg', 'pctDmg', 'flatDmg', 'intelligence'],
        defense: ['energyShield', 'energyShieldPct', 'flatHp', 'pctHp', 'resAll', 'resChaos', 'regen']
    },
    wanderer: {
        offense: ['meleePctDmg', 'physPctDmg', 'dotPctDmg', 'bleedChance', 'poisonChance', 'crit', 'aspd', 'dexterity'],
        defense: ['evasion', 'evasionPct', 'deflectChance', 'flatHp', 'pctHp', 'move', 'regen']
    },
    cleric: {
        offense: ['shieldPctDmg', 'spellPctDmg', 'elementalPctDmg', 'pctDmg', 'strength', 'intelligence'],
        defense: ['energyShield', 'energyShieldPct', 'armor', 'armorPct', 'blockChance', 'resAll', 'pctHp']
    },
    warrior: {
        offense: ['meleePctDmg', 'slamPctDmg', 'physPctDmg', 'flatDmg', 'aspd', 'strength'],
        defense: ['armor', 'armorPct', 'flatHp', 'pctHp', 'blockChance', 'dr', 'regen']
    },
    alchemist: {
        offense: ['potionPctDmg', 'minePctDmg', 'aoePctDmg', 'spellPctDmg', 'dotPctDmg', 'elementalPctDmg',
            'firePctDmg', 'coldPctDmg', 'lightPctDmg', 'poisonChance'],
        defense: ['evasion', 'evasionPct', 'energyShield', 'energyShieldPct', 'flatHp', 'pctHp', 'resAll', 'regen']
    },
    archer: {
        offense: ['projectilePctDmg', 'physPctDmg', 'coldPctDmg', 'crit', 'aspd', 'accuracy', 'dexterity'],
        defense: ['evasion', 'evasionPct', 'deflectChance', 'flatHp', 'pctHp', 'move', 'resAll']
    }
});

function nodeStats(node) {
    return new Set((node.runtimeEffects || []).map(effect => effect.statId));
}

function hasAnyStat(node, statIds) {
    const stats = nodeStats(node);
    return statIds.some(statId => stats.has(statId));
}

function legacyPower(node, legacyStats) {
    const tierKey = LEGACY_TIER_KEY[node.type];
    const fallbackKeys = tierKey === 's' ? ['s', 'm', 'k'] : (tierKey === 'm' ? ['m', 's', 'k'] : ['k', 'm', 's']);
    return (node.runtimeEffects || []).reduce((sum, effect) => {
        const stat = legacyStats[effect.statId] || {};
        const baseline = fallbackKeys.map(key => Number(stat[key])).find(value => value > 0);
        return baseline > 0 ? sum + Math.abs(Number(effect.value) || 0) / baseline : sum;
    }, 0);
}

function stageSummary(tree, graph, startId, statProfile, legacyStats) {
    const distances = graphDistances(graph, [startId]);
    return Object.fromEntries(Object.entries(STAGES).map(([stage, maxDistance]) => {
        const nodes = tree.nodes.filter(node => ACTIONABLE_TYPES.has(node.type)
            && Number(distances.get(String(node.id))) > 0 && Number(distances.get(String(node.id))) <= maxDistance);
        const comparable = nodes.filter(node => node.optionProfile && !String(node.optionProfile).startsWith('authored:')
            && !SPECIAL_ARCHETYPES.has(node.archetype) && legacyPower(node, legacyStats) > 0);
        return [stage, {
            nodes: nodes.length,
            offense: nodes.filter(node => hasAnyStat(node, statProfile.offense)).length,
            defense: nodes.filter(node => hasAnyStat(node, statProfile.defense)).length,
            majors: nodes.filter(node => node.type === 'major').length,
            legacyPower: comparable.length
                ? Number((comparable.reduce((sum, node) => sum + legacyPower(node, legacyStats), 0) / comparable.length).toFixed(3)) : 0
        }];
    }));
}

function assertStageOptions(classId, stages) {
    assert.ok(stages.early.nodes >= 12, `${classId} 초반 선택지가 너무 적습니다.`);
    assert.ok(stages.early.offense >= 1, `${classId} 시작점 6포인트 안에 공격 선택지가 없습니다.`);
    assert.ok(stages.early.defense >= 1, `${classId} 시작점 6포인트 안에 방어 선택지가 없습니다.`);
    assert.ok(stages.middle.offense >= 4 && stages.middle.defense >= 4, `${classId} 중반 공격/방어 갈래가 부족합니다.`);
    assert.ok(stages.late.offense >= 10 && stages.late.defense >= 10, `${classId} 후반 빌드 선택지가 부족합니다.`);
    Object.entries(stages).forEach(([stage, summary]) => {
        assert.ok(summary.legacyPower >= 0.95, `${classId} ${stage} 노드 효율이 구 트리 기준의 95%보다 낮습니다: ${summary.legacyPower}`);
    });
}

function profilePower(node, profileByName) {
    if (!node.optionProfile || String(node.optionProfile).startsWith('authored:')) return null;
    const profile = profileByName.get(node.optionProfile);
    if (!profile) return null;
    const scalable = profile.lines.filter(line => !line.fixed && (!line.majorOnly || node.type === 'major'));
    if (scalable.length === 0) return null;
    const effects = new Map((node.runtimeEffects || []).map(effect => [effect.statId, Number(effect.value)]));
    const ratios = scalable.map(line => effects.get(line.statId) / line.value).filter(Number.isFinite);
    return ratios.length ? ratios.reduce((sum, value) => sum + value, 0) / ratios.length : null;
}

function profileQuantizationTolerance(node, profileByName) {
    if (!node.optionProfile || String(node.optionProfile).startsWith('authored:')) return 0;
    const profile = profileByName.get(node.optionProfile);
    if (!profile) return 0;
    const lines = profile.lines.filter(line => !line.fixed && (!line.majorOnly || node.type === 'major'));
    if (lines.length === 0) return 0;
    return lines.reduce((sum, line) => sum + passiveValueStep(line.statId) / (2 * Math.abs(line.value)), 0) / lines.length;
}

function assertDistanceScaling(tree, topology) {
    const profileByName = new Map(Object.values(ARCHETYPE_PROFILES).flatMap(profiles => profiles.map(profile => [profile.name, profile])));
    const minimumByBand = [1, 1.05, 1.1, 1.15, 1.2];
    const violations = [];
    tree.nodes.filter(node => ACTIONABLE_TYPES.has(node.type) && !SPECIAL_ARCHETYPES.has(node.archetype)
        && !topology.corridorIds.has(String(node.id))).forEach(node => {
        const score = profilePower(node, profileByName);
        if (score === null) return;
        const typeBase = { minor: 1, assist: 1.15, normal: 1.6, major: 2.4 }[node.type];
        const expected = typeBase * minimumByBand[Math.min(4, Number(node.powerBand) || 0)];
        const tolerance = Math.max(0.12, profileQuantizationTolerance(node, profileByName));
        if (score + tolerance < expected) violations.push(`${node.id}/${score.toFixed(2)} < ${expected.toFixed(2)}`);
    });
    assert.deepStrictEqual(violations, [], `거리별 노드 강화가 누락되었습니다:\n${violations.join('\n')}`);
}

function main() {
    const tree = readTree('artifacts/passive-tree/260831_2passive-normalized.json');
    const graph = buildGraph(tree);
    const topology = classifyPassiveTreeTopology(tree);
    const runtime = buildGameRuntime();
    const legacyStats = JSON.parse(vm.runInContext('JSON.stringify(P_STATS)', runtime));
    const starts = Object.fromEntries(tree.nodes.filter(node => node.startClassId).map(node => [node.startClassId, String(node.id)]));
    const report = {};
    Object.entries(CLASS_STATS).forEach(([classId, stats]) => {
        report[classId] = stageSummary(tree, graph, starts[classId], stats, legacyStats);
    });
    console.log(JSON.stringify(report, null, 2));
    Object.entries(report).forEach(([classId, stages]) => assertStageOptions(classId, stages));
    assertDistanceScaling(tree, topology);
    console.log('smoke-passive-tree-balance passed');
}

main();
