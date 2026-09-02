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

function assertElementalMajorCorrections(tree) {
    const nodes = new Map(tree.nodes.map(node => [String(node.id), node]));
    const expected = {
        nmw6zlmrzvb: {
            cat: 'lightning', archetype: 'lightning',
            effects: [{ statId: 'lightPctDmg', value: 30 }, { statId: 'maxResL', value: 1 }]
        },
        n33yhibs13g: {
            cat: 'cold', archetype: 'cold',
            effects: [{ statId: 'coldPctDmg', value: 30 }, { statId: 'maxResC', value: 1 }]
        }
    };
    Object.entries(expected).forEach(([id, contract]) => {
        const node = nodes.get(id);
        assert(node, `교정 대상 노드가 없습니다: ${id}`);
        assert.strictEqual(node.cat, contract.cat, `${id}의 태그가 설명 속성과 일치해야 합니다.`);
        assert.strictEqual(node.archetype, contract.archetype, `${id}의 원형이 설명 속성과 일치해야 합니다.`);
        assert.deepStrictEqual(node.mods, contract.effects, `${id}의 작성 효과가 잘못되었습니다.`);
        assert.deepStrictEqual(node.runtimeEffects, contract.effects, `${id}의 실제 적용 효과가 잘못되었습니다.`);
    });
}

function countClustersWithStat(tree, statId) {
    return new Set(tree.nodes.filter(node => (node.runtimeEffects || []).some(effect => effect.statId === statId))
        .map(node => node.optionClusterId || `node:${node.id}`)).size;
}

function assertCuratedDefenseAndGemDistribution(tree) {
    const expectedClusters = { dr: 6, resF: 6, resC: 6, resL: 6, resChaos: 6, resAll: 4 };
    Object.entries(expectedClusters).forEach(([statId, expected]) => {
        assert.strictEqual(countClustersWithStat(tree, statId), expected, `${statId} 획득처 수가 달라졌습니다.`);
    });
    const expectedMaxRes = { maxResF: 3, maxResC: 1, maxResL: 1, maxResChaos: 1 };
    Object.entries(expectedMaxRes).forEach(([statId, expected]) => {
        let count = tree.nodes.filter(node => (node.runtimeEffects || []).some(effect => effect.statId === statId)).length;
        assert.strictEqual(count, expected, `${statId} 주요 패시브 수가 달라졌습니다.`);
    });
    const gemStats = ['spellGemLevel', 'fireGemLevel', 'coldGemLevel', 'lightGemLevel', 'elementalGemLevel',
        'projectileGemLevel', 'meleeGemLevel', 'slamGemLevel', 'dotGemLevel', 'aoeGemLevel'];
    gemStats.forEach(statId => {
        let owners = tree.nodes.filter(node => (node.runtimeEffects || []).some(effect => effect.statId === statId));
        assert.strictEqual(owners.length, 1, `${statId}은 정확히 한 곳에서만 획득해야 합니다.`);
        assert.strictEqual(owners[0].type, 'major', `${statId}은 주요 패시브에만 있어야 합니다.`);
    });
    assert.strictEqual(countClustersWithStat(tree, 'slamPctDmg'), 2, '강타 피해는 전사 구역의 두 뭉치에 집중되어야 합니다.');
    let warriorAccuracy = tree.nodes.filter(node => node.optionClusterId === 'anchor:newxmmn28wz'
        && (node.runtimeEffects || []).some(effect => effect.statId === 'accuracy'));
    assert.strictEqual(warriorAccuracy.length, 3, '전사 구역의 작은 정확도 갈래가 유지되어야 합니다.');
    assert.strictEqual(countClustersWithStat(tree, 'chillEffect'), 1, '냉각 효율은 한 갈래에 있어야 합니다.');
    assert.strictEqual(countClustersWithStat(tree, 'igniteDamageMultiplierPct'), 2, '점화 효율은 두 갈래에 있어야 합니다.');
    assert.strictEqual(countClustersWithStat(tree, 'shockEffect'), 2, '감전 효율은 두 갈래에 있어야 합니다.');
}

function assertMissingPassiveSupport(runtime) {
    const run = source => vm.runInContext(source, runtime);
    run("game.passives = []; game.activeSkill = '기본 공격';");
    const baseline = run('getPlayerStats()');
    for (const [id, icon] of [['completion_wanderer_dagger_10', 'blade'], ['njbqg7vrd9k', 'arcane'],
        ['no3kqxbre07', 'arcane'], ['nqjbg9yt7vt', 'life']]) {
        assert.strictEqual(runtime.getPassiveNodeIconFamily(runtime.PASSIVE_TREE.nodes[id]), icon);
    }
    const cases = [
        ['expansion_archer_arrow_fan_04', 'ds', 10, 'ds', 10],
        ['backbone_branch_warrior_wanderer_center_t4_n04', 'leech', 0.5, 'leech', 0.5],
        ['newd0r0xeoe', 'chillChance', 5, 'chillChance', 5],
        ['n7sr619yw1e', 'energyShieldRegen', 2, 'energyShieldRegenRate', 2],
        ['nqfx25r1u7w', 'energyShieldRechargeFaster', 0.1, 'energyShieldRechargeDelay', -0.1],
        ['n7mumm5x6wu', 'coldPctDmg', 10, 'talentSourceStats.coldPct', 10],
        ['ngxf5hpx0nn', 'lightPctDmg', 10, 'talentSourceStats.lightPct', 10]
    ];
    for (const [id, stat, amount, field, delta] of cases) {
        run(`game.passives = [${JSON.stringify(id)}];`);
        assert.strictEqual(runtime.getAllocatedPassiveStatValue(stat), amount, `${id}: missing allocated effect`);
        const after = run('getPlayerStats()');
        const read = stats => field.split('.').reduce((value, key) => value[key], stats);
        assert.ok(Math.abs(read(after) - read(baseline) - delta) < 1e-8, `${id}: combat stat mismatch`);
        assert.strictEqual(Object.fromEntries(run('getAllocatedPassiveStatSummary().totals'))[stat], amount);
    }
    run("game.passives = []; game.activeSkill = Object.keys(SKILL_DB).find(id => SKILL_DB[id].tags.includes('spell') && SKILL_DB[id].spellFlatBase > 0);");
    const spellBefore = run('getPlayerStats().baseDmg');
    for (const [id, stat, amount] of [['no3kqxbre07', 'spellFlatPct', 10], ['njbqg7vrd9k', 'spellFlatDmg', 5]]) {
        run(`game.passives = [${JSON.stringify(id)}];`);
        assert.strictEqual(runtime.getAllocatedPassiveStatValue(stat), amount);
        assert.ok(run('getPlayerStats().baseDmg') > spellBefore, `${stat}: spell damage must actually increase`);
        run("game.activeSkill = '기본 공격';");
        assert.strictEqual(run('getPlayerStats().baseDmg'), baseline.baseDmg, 'spell-only bonuses must not affect attacks');
        run("game.activeSkill = Object.keys(SKILL_DB).find(id => SKILL_DB[id].tags.includes('spell') && SKILL_DB[id].spellFlatBase > 0);");
    }
    run("game.passives = ['backbone_branch_occultist_outer_1_t1_n05'];");
    assert.strictEqual(runtime.getAllocatedPassiveStatValue('spellFlatDmg'), 10, 'restore the lost flat spell damage');
    assert.strictEqual(runtime.getAllocatedPassiveStatValue('spellGemLevel'), 1, 'keep the spell gem level');
    run("game.passives = []; game.activeSkill = '기본 공격';");
    assert.strictEqual(run('getPlayerStats().ds'), baseline.ds, 'removing the nodes must remove their bonuses');
}

function main() {
    const tree = readTree('artifacts/passive-tree/260831_2passive-normalized.json');
    const graph = buildGraph(tree);
    const topology = classifyPassiveTreeTopology(tree);
    const runtime = buildGameRuntime();
    assertMissingPassiveSupport(runtime);
    const legacyStats = JSON.parse(vm.runInContext('JSON.stringify(P_STATS)', runtime));
    const starts = Object.fromEntries(tree.nodes.filter(node => node.startClassId).map(node => [node.startClassId, String(node.id)]));
    const report = {};
    Object.entries(CLASS_STATS).forEach(([classId, stats]) => {
        report[classId] = stageSummary(tree, graph, starts[classId], stats, legacyStats);
    });
    console.log(JSON.stringify(report, null, 2));
    Object.entries(report).forEach(([classId, stages]) => assertStageOptions(classId, stages));
    assertDistanceScaling(tree, topology);
    assertElementalMajorCorrections(tree);
    assertCuratedDefenseAndGemDistribution(tree);
    const runtimeCorrections = JSON.parse(vm.runInContext(`JSON.stringify([
        PASSIVE_TREE.nodes.nmw6zlmrzvb.effects,
        PASSIVE_TREE.nodes.n33yhibs13g.effects
    ])`, runtime));
    assert.deepStrictEqual(runtimeCorrections, [
        [{ stat: 'lightPctDmg', val: 30 }, { stat: 'maxResL', val: 1 }],
        [{ stat: 'coldPctDmg', val: 30 }, { stat: 'maxResC', val: 1 }]
    ], '작성 원천을 다시 빌드해도 두 원소 주요 패시브의 실제 효과가 유지되어야 한다');
    console.log('smoke-passive-tree-balance passed');
}

main();
