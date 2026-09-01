#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { readTree } = require('./audit-passive-tree-source');
const { STAT_META } = require('./lib/passive-tree-option-catalog');
const { AUTHORED_MAJOR_NODE_IDS, CENTRAL_VOID_NO_EFFECT_NODE_IDS, hasNoEffects } = require('./lib/passive-tree-intent');
const { reviewTree } = require('./review-passive-tree-source');

const ACTIONABLE_TYPES = new Set(['minor', 'assist', 'normal', 'major']);
const MANUAL_TAGS = Object.freeze({
    nl3nb5slzaq: 'mystique', nt1k7og2x4w: 'dex', n5v7rm12tcj: 'dex', nqqx97634v1: 'def',
    expansion_occult_ritual_eye_10: 'chaos', expansion_occult_grimoire_04: 'spell', nna1811tgdl: 'devotion'
});
const ENDPOINT_CAPSTONES = Object.freeze({
    n956tvboxg3: ['축적된 지식', [mod('intelligence', 10), mod('energyShield', 20)]],
    nyrqds8wy3x: ['비전 장막', [mod('energyShieldPct', 8), mod('energyShield', 20)]],
    ndu0j2rne0y: ['빠른 감염', [mod('dotPctDmg', 7), mod('aspd', 2.5)]],
    ngcaelcni8g: ['상처의 숙성', [mod('dotPctDmg', 8), mod('bleedChance', 4)]],
    n1eexi6ntke: ['불씨의 숙성', [mod('dotPctDmg', 8), mod('igniteChance', 4)]],
    npkdqponuxk: ['독의 숙성', [mod('dotPctDmg', 8), mod('poisonChance', 4)]],
    nzsokkouxmx: ['타오르는 핵', [mod('firePctDmg', 8), mod('igniteChance', 4)]],
    n6tgq5ouygl: ['번지는 불씨', [mod('firePctDmg', 7.5), mod('aoePctDmg', 5)]]
});

function mod(statId, value, target) {
    return target ? { statId, value, target } : { statId, value };
}

function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
}

function nodeMap(tree) {
    return new Map(tree.nodes.map(node => [String(node.id), node]));
}

function recordChange(report, field, node, before, after, reason) {
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    report[field].push({ id: String(node.id), name: node.name, reason, before, after });
}

function setField(report, field, node, value, reason) {
    const before = clone(node[field]);
    node[field] = clone(value);
    recordChange(report, `${field}Changes`, node, before, node[field], reason);
}

function setAuthoredNode(report, node, authored, reason) {
    if (authored.cat) setField(report, 'cat', node, authored.cat, reason);
    if (authored.name) setField(report, 'name', node, authored.name, reason);
    if (authored.mods) setField(report, 'mods', node, authored.mods, reason);
}

function applyAuthoredTextCorrections(tree, report) {
    const nodes = nodeMap(tree);
    setField(report, 'desc', nodes.get('nv67fzprmet'),
        '연결된 능력치 노드 1개당 계시 1을 획득합니다.\n능력치 노드에서는 헌신의 서약을 할당할 수 없습니다.',
        '헌신의 서약 원래 규칙은 유지하고 오탈자와 잘못된 명칭만 교정');
    setField(report, 'name', nodes.get('nr9ez53ar77'), '봉인된 대주문진',
        '서로 다른 주요 패시브의 중복 이름 구분');
}

function applyEndpointCapstones(tree, report) {
    const nodes = nodeMap(tree);
    Object.entries(ENDPOINT_CAPSTONES).forEach(([id, [name, mods]]) => {
        const node = nodes.get(id), reason = '특징 노드 없이 끝나는 갈래에 선택 가치가 있는 종착 보상 배치';
        assert.ok(node, `종착 패시브가 없습니다: ${id}`);
        setField(report, 'type', node, 'normal', reason);
        setAuthoredNode(report, node, { name, mods }, reason);
        setField(report, 'statAutoName', node, false, reason);
        setField(report, 'optionProfile', node, `authored:${name}`, reason);
    });
}

function applyAuthoredGradeCorrections(tree, report) {
    const nodes = nodeMap(tree);
    AUTHORED_MAJOR_NODE_IDS.forEach(id => {
        const node = nodes.get(id), reason = '주요 패시브급 효과에 맞게 노드 등급을 교정';
        assert.ok(node, `등급 교정 대상 패시브가 없습니다: ${id}`);
        setField(report, 'type', node, 'major', reason);
        setField(report, 'statAutoName', node, false, reason);
        setField(report, 'optionProfile', node, `authored:${node.name}`, reason);
    });
}

function restoreCentralNoEffectNodes(tree, report) {
    const nodes = nodeMap(tree);
    CENTRAL_VOID_NO_EFFECT_NODE_IDS.forEach(id => {
        const node = nodes.get(id);
        assert.ok(node, `중앙 무효 패시브가 없습니다: ${id}`);
        const reason = '공허 주변의 의도적인 무효 패시브 복구';
        setField(report, 'cat', node, 'none', reason);
        setField(report, 'name', node, '', reason);
        setField(report, 'desc', node, '', reason);
        setField(report, 'mods', node, [], reason);
        setField(report, 'runtimeEffects', node, [], reason);
        setField(report, 'archetype', node, 'none', reason);
        setField(report, 'statAutoName', node, false, reason);
        setField(report, 'optionProfile', node, 'authored:no-effect', reason);
        setField(report, 'intentionalNoEffect', node, true, reason);
    });
}

function applyMissingTags(tree, baseline, report) {
    const review = reviewTree(tree, baseline), nodes = nodeMap(tree);
    review.missingTags.rows.forEach(row => {
        const node = nodes.get(row.id), suggested = MANUAL_TAGS[row.id] || row.suggestedCat;
        if (!suggested) throw new Error(`태그를 결정하지 못한 노드: ${row.id}`);
        setField(report, 'cat', node, suggested, row.confidence === 'manual' ? '수동 태그 판정' : '효과/이웃 태그 판정');
    });
}

function applyUnsupportedConversions(tree, report) {
    tree.nodes.filter(node => ACTIONABLE_TYPES.has(node.type)).forEach(node => {
        const converted = (node.mods || []).flatMap(entry => {
            if (entry.statId === 'attribute' && entry.target === 'all') {
                return ['strength', 'dexterity', 'intelligence'].map(statId => mod(statId, entry.value));
            }
            if (entry.statId === 'critical_strike_chance') return [mod('crit', entry.value)];
            if (entry.statId === 'critical_damage_multiplier') return [mod('critDmg', entry.value)];
            return [entry];
        });
        setField(report, 'mods', node, converted, '미지원 원본 옵션을 런타임 지원 옵션으로 명시 변환');
    });
}

function applyDevotionElementalFix(nodes, report) {
    const ids = ['n7f1rjzwy3x', 'nl6hlnowy3x', 'nq8f7ehwy3x', 'nv454v0wy3x', 'nxgws2dwy3x'];
    ids.forEach(id => setAuthoredNode(report, nodes.get(id), {
        cat: 'devotion', name: '계시', mods: [mod('devotion', 1)]
    }, '계시 구역의 소형 패시브를 단순 계시 효과로 정리'));
}

function applyAlchemistPhysicalFix(nodes, report) {
    const fixes = {
        v13_bulk_연금술사_3_05: ['핏빛 촉매', [mod('physPctDmg', 5.5)]],
        v13_bulk_연금술사_3_07: ['응고 촉진', [mod('bleedChance', 3.5)]],
        v13_bulk_연금술사_3_09: ['상처 증류', [mod('dotPctDmg', 5.5)]]
    };
    Object.entries(fixes).forEach(([id, [name, mods]]) =>
        setAuthoredNode(report, nodes.get(id), { cat: 'physical', name, mods }, '연금술사 물리/출혈 뭉치에서 주문 효과 제거'));
}

function applyCenterMystiqueFix(nodes, report) {
    const smallIds = ['v13_balance_center_left_orbit_01', 'v13_balance_center_left_orbit_02',
        'v13_balance_center_left_orbit_03', 'v13_balance_center_left_orbit_04',
        'v13_balance_center_left_orbit_05', 'v13_balance_center_left_orbit_06'];
    smallIds.forEach(id => setAuthoredNode(report, nodes.get(id), {
        cat: 'mystique', name: '신비', mods: [mod('mystique', 1)]
    }, '중앙 왼쪽 궤도의 소형 패시브를 단순 신비 효과로 정리'));
    setAuthoredNode(report, nodes.get('v13_balance_center_left_orbit_07'), {
        cat: 'mystique', name: '세 겹의 궤도', mods: [mod('mystique', 2)]
    }, '중앙 왼쪽 궤도의 주요 패시브만 강화 효과로 유지');
}

function applyMixedBundleCorrections(tree, report) {
    const nodes = nodeMap(tree);
    applyDevotionElementalFix(nodes, report);
    applyAlchemistPhysicalFix(nodes, report);
    applyCenterMystiqueFix(nodes, report);
    setAuthoredNode(report, nodes.get('n1w99hu7k7i'), {
        cat: 'atk', name: '독화살 연구', mods: [mod('projectilePctDmg', 5), mod('dotPctDmg', 5)]
    }, '궁수 공격 뭉치에 섞인 신비 노드를 투사체 지속 피해 연결 노드로 정리');
    setAuthoredNode(report, nodes.get('nl3nb5slzaq'), {
        cat: 'mystique', name: '신비', mods: [mod('mystique', 1)]
    }, '신비 고리에 섞인 투사체 효과를 신비 노드로 복구');
    setAuthoredNode(report, nodes.get('nna1811tgdl'), {
        cat: 'devotion', name: '계시', mods: [mod('devotion', 1)]
    }, '계시 뭉치의 소형 패시브를 단순 계시 효과로 정리');
    setAuthoredNode(report, nodes.get('v13_balance_center_dimensional_prism_05'), {
        cat: 'spell', name: '주문 직조', mods: [mod('spellPctDmg', 4.5)]
    }, '지능/보호막 프리즘에 섞인 투사체 효과를 주문 효과로 정리');
}

function projectileMods(value, extras = []) {
    return [mod('damage_method', value, 'projectile'), ...extras];
}

function applyArcherChoiceLoops(nodes, report) {
    const fixes = {
        v13_bulk_궁수_1_02: ['정밀 조준', projectileMods(5, [mod('accuracy', 35)])],
        v13_bulk_궁수_1_03: ['매의 조준', projectileMods(10, [mod('accuracy', 80)])],
        v13_bulk_궁수_1_04: ['곧은 궤적', projectileMods(5)],
        v13_bulk_궁수_1_05: ['약점 조준', projectileMods(5, [mod('crit', 0.8)])],
        v13_bulk_궁수_1_07: ['빠른 시위', projectileMods(5, [mod('aspd', 1.5)])],
        v13_bulk_궁수_1_08: ['질풍 사격', projectileMods(10, [mod('aspd', 4)])],
        v13_bulk_궁수_1_09: ['곧은 궤적', projectileMods(5)],
        v13_bulk_궁수_1_10: ['바람 추적', projectileMods(5, [mod('move', 1.5)])],
        v13_bulk_궁수_1_12: ['분열 조준', projectileMods(5, [mod('accuracy', 30)])],
        v13_bulk_궁수_1_13: ['갈라지는 탄도', projectileMods(7.5, [mod('projectileExtraShots', 1)])],
        v13_bulk_궁수_1_14: ['곧은 궤적', projectileMods(5)],
        v13_bulk_궁수_1_15: ['급소 궤적', projectileMods(5, [mod('crit', 0.8)])]
    };
    Object.entries(fixes).forEach(([id, [name, mods]]) =>
        setAuthoredNode(report, nodes.get(id), { cat: 'atk', name, mods }, '궁수 동일 갈래를 정밀/속도/다중 투사체 선택으로 분리'));
}

function applySpecialCore(nodes, ids, statId, label, report) {
    ids.forEach(id => {
        const node = nodes.get(id), feature = node.type === 'normal' || node.type === 'major';
        setAuthoredNode(report, node, { cat: statId, name: feature ? `${label}의 핵` : label,
            mods: [mod(statId, feature ? 2 : 1)] }, '중앙 특수 스탯 뭉치의 끝 노드 보상 강화');
    });
}

function applyIdenticalChoiceCorrections(tree, report) {
    const nodes = nodeMap(tree);
    applyArcherChoiceLoops(nodes, report);
    applySpecialCore(nodes, ['n3j2xrf67a0', 'n7p64hh67a0', 'nn6akyl67a0', 'nzr6v5o67a0'], 'devotion', '계시', report);
    applySpecialCore(nodes, ['expansion_core_prism_06', 'expansion_core_prism_07', 'expansion_core_prism_08', 'expansion_core_prism_09'], 'devotion', '계시', report);
    applySpecialCore(nodes, ['expansion_core_prism_14', 'expansion_core_prism_15', 'expansion_core_prism_16', 'expansion_core_prism_17'], 'cycle', '순환', report);
    applySpecialCore(nodes, ['expansion_core_prism_22', 'expansion_core_prism_23', 'expansion_core_prism_24', 'expansion_core_prism_25'], 'mystique', '신비', report);
}

function canonicalEffects(mods) {
    return (mods || []).flatMap(entry => {
        if (entry.statId === 'attribute') return [mod(entry.target, entry.value)];
        if (entry.statId !== 'damage_method') return [mod(entry.statId, Number(entry.value))];
        const statId = { projectile: 'projectilePctDmg', melee: 'meleePctDmg', area: 'aoePctDmg' }[entry.target];
        return [mod(statId || entry.statId, Number(entry.value))];
    });
}

function effectLabel(entry) {
    if (entry.statId === 'attribute') return { strength: '힘', dexterity: '민첩', intelligence: '지능' }[entry.target] || '능력치';
    if (entry.statId === 'damage_method') return { projectile: '투사체 피해', melee: '근접 피해', area: '범위 피해' }[entry.target] || '피해';
    if (entry.statId === 'devotion') return '계시';
    return STAT_META[entry.statId]?.[0] || entry.statId;
}

function effectSuffix(entry) {
    if (entry.statId === 'attribute') return '';
    if (entry.statId === 'damage_method') return '%';
    return STAT_META[entry.statId]?.[1] || '';
}

function formatDescription(mods) {
    return (mods || []).map(entry => {
        const value = Number(entry.value), sign = value >= 0 ? '+' : '';
        return `${effectLabel(entry)} ${sign}${value}${effectSuffix(entry)}`;
    }).join('\n');
}

function archetypeFor(node) {
    const statId = canonicalEffects(node.mods)[0]?.statId;
    const direct = { strength: 'strength', dexterity: 'dexterity', intelligence: 'intelligence',
        meleePctDmg: 'melee', projectilePctDmg: 'projectile', shieldPctDmg: 'shield', potionPctDmg: 'potion',
        physPctDmg: 'physical', spellPctDmg: 'spell', chaosPctDmg: 'chaos', firePctDmg: 'fire',
        coldPctDmg: 'cold', lightPctDmg: 'lightning', elementalPctDmg: 'elemental', mystique: 'mystique',
        devotion: 'devotion', cycle: 'cycle', poisonChance: 'ailment', dotPctDmg: 'ailment' };
    if (direct[statId]) return direct[statId];
    if (['evasion', 'evasionPct', 'deflectChance'].includes(statId)) return 'evasion';
    if (['energyShield', 'energyShieldPct'].includes(statId)) return 'energyShield';
    if (['armor', 'armorPct', 'blockChance', 'pctHp', 'flatHp', 'resAll', 'regen'].includes(statId)) return 'armor';
    return node.cat;
}

function repairDescriptionsAndDerived(tree, originalReview, report) {
    const repairIds = new Set([
        ...originalReview.descriptions.lineCountMismatches.rows.map(row => row.id),
        ...originalReview.descriptions.evasionUnitMismatches.rows.map(row => row.id),
        ...report.modsChanges.map(row => row.id)
    ]);
    tree.nodes.filter(node => ACTIONABLE_TYPES.has(node.type)).forEach(node => {
        if (repairIds.has(String(node.id))) setField(report, 'desc', node, formatDescription(node.mods), '설명과 실제 효과 줄/단위 동기화');
        setField(report, 'runtimeEffects', node, canonicalEffects(node.mods), 'mods에서 런타임 효과 재생성');
        setField(report, 'archetype', node, archetypeFor(node), '교정된 주 효과에서 파생 계열 재생성');
    });
}

function targetRows(tree) {
    return tree.nodes.flatMap(node => (node.mods || []).map((entry, index) => ({ id: String(node.id), index,
        statId: entry.statId, target: entry.target })).filter(row => row.target));
}

function validateOutput(source, output, baseline) {
    assert.strictEqual(output.nodes.length, source.nodes.length, '노드 수를 바꾸면 안 됩니다.');
    assert.deepStrictEqual(output.edges, source.edges, '연결선을 바꾸면 안 됩니다.');
    const review = reviewTree(output, baseline);
    assert.strictEqual(review.missingTags.count, 0, '태그 미지정 노드가 남았습니다.');
    assert.strictEqual(review.descriptions.lineCountMismatches.count, 0, '설명 줄 누락이 남았습니다.');
    assert.strictEqual(review.descriptions.evasionUnitMismatches.count, 0, '회피 단위 불일치가 남았습니다.');
    assert.strictEqual(review.runtime.unsupportedByCurrentPipeline.count, 0, '미지원 옵션이 남았습니다.');
    assert.strictEqual(review.runtime.staleRuntimeEffects.count, 0, 'runtimeEffects가 mods와 다릅니다.');
    assert.strictEqual(review.identicalBundles.count, 0, '선택지가 모두 같은 뭉치가 남았습니다.');
    assert.strictEqual(review.summary.manualMixedBundles, 0, '서로 어울리지 않는 계열이 섞인 뭉치가 남았습니다.');
    output.nodes.filter(node => ACTIONABLE_TYPES.has(node.type)).forEach(node =>
        (node.runtimeEffects || []).forEach(effect => assert.ok(STAT_META[effect.statId], `런타임 미지원 효과: ${node.id}/${effect.statId}`)));
    const nodes = nodeMap(output);
    CENTRAL_VOID_NO_EFFECT_NODE_IDS.forEach(id => {
        const node = nodes.get(id);
        assert.ok(node.intentionalNoEffect, `무효 패시브 표식이 없습니다: ${id}`);
        assert.strictEqual(node.cat, 'none', `무효 패시브 태그가 바뀌었습니다: ${id}`);
        assert.strictEqual(node.name, '', `무효 패시브 이름이 생겼습니다: ${id}`);
        assert.strictEqual(node.desc, '', `무효 패시브 설명이 생겼습니다: ${id}`);
        assert.ok(hasNoEffects(node), `무효 패시브에 효과가 생겼습니다: ${id}`);
    });
    return review;
}

function createReport(sourceFile, outputFile) {
    return { source: path.resolve(sourceFile), output: path.resolve(outputFile), typeChanges: [], catChanges: [], nameChanges: [],
        modsChanges: [], descChanges: [], runtimeEffectsChanges: [], archetypeChanges: [],
        statAutoNameChanges: [], optionProfileChanges: [], intentionalNoEffectChanges: [] };
}

function writeJson(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function correctTree(source, baseline, report) {
    const output = clone(source), originalReview = reviewTree(source, baseline);
    restoreCentralNoEffectNodes(output, report);
    applyMissingTags(output, baseline, report);
    applyUnsupportedConversions(output, report);
    applyMixedBundleCorrections(output, report);
    applyIdenticalChoiceCorrections(output, report);
    applyAuthoredTextCorrections(output, report);
    applyEndpointCapstones(output, report);
    applyAuthoredGradeCorrections(output, report);
    repairDescriptionsAndDerived(output, originalReview, report);
    return output;
}

function main() {
    const [sourceFile, baselineFile, outputFile, reportFile] = process.argv.slice(2);
    if (!sourceFile || !baselineFile || !outputFile || !reportFile) {
        throw new Error('사용법: node scripts/correct-passive-tree-source.js <source.json> <baseline.json> <output.json> <report.json>');
    }
    const source = readTree(sourceFile), baseline = readTree(baselineFile), report = createReport(sourceFile, outputFile);
    const originalTargets = targetRows(source), output = correctTree(source, baseline, report);
    const finalReview = validateOutput(source, output, baseline), correctedTargets = targetRows(output);
    report.summary = Object.fromEntries(['typeChanges', 'catChanges', 'nameChanges', 'modsChanges', 'descChanges',
        'runtimeEffectsChanges', 'archetypeChanges', 'statAutoNameChanges', 'optionProfileChanges',
        'intentionalNoEffectChanges'].map(key => [key, report[key].length]));
    report.targetPreservation = { before: originalTargets.length, after: correctedTargets.length,
        intentionalAllAttributeExpansions: ['uniform_p030_02', 'uniform_p150_01'] };
    report.finalReview = finalReview.summary;
    writeJson(outputFile, output);
    writeJson(reportFile, report);
    console.log(JSON.stringify({ ...report.summary, targetPreservation: report.targetPreservation,
        finalReview: report.finalReview }, null, 2));
}

if (require.main === module) main();

module.exports = { correctTree, formatDescription, validateOutput };
