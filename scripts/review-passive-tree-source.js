#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildGraph, readTree } = require('./audit-passive-tree-source');
const { STAT_META, isAllAttributesEffects } = require('./lib/passive-tree-option-catalog');
const { visualBundleAudit } = require('./lib/passive-tree-clusters');
const { auditShortBranchChoices } = require('./lib/passive-tree-branch-choices');
const { isIntentionalNoEffectNode } = require('./lib/passive-tree-intent');
const { classifyPassiveTreeTopology } = require('./lib/passive-tree-topology');

const ACTIONABLE_TYPES = new Set(['minor', 'assist', 'normal', 'major']);
const ATTRIBUTE_CATEGORIES = new Set(['str', 'dex', 'int', 'attr']);
const SPECIAL_CATEGORIES = new Set(['mystique', 'devotion', 'cycle']);
const CATEGORY_BY_STAT = Object.freeze({
    strength: 'str', dexterity: 'dex', intelligence: 'int',
    meleePctDmg: 'atk', projectilePctDmg: 'atk', shieldPctDmg: 'atk', potionPctDmg: 'atk',
    accuracy: 'atk', projectileExtraShots: 'atk', flatDmg: 'atk', aspd: 'atk', crit: 'atk', critDmg: 'atk',
    physPctDmg: 'physical', physIgnore: 'physical', bleedChance: 'physical',
    armor: 'def', armorPct: 'def', evasion: 'def', evasionPct: 'def', energyShield: 'def',
    energyShieldPct: 'def', pctHp: 'def', flatHp: 'def', blockChance: 'def', deflectChance: 'def',
    resAll: 'def', regen: 'def', dr: 'def', spellPctDmg: 'spell', gemLevel: 'spell', suppCap: 'spell',
    summonPctDmg: 'spell', summonAspd: 'spell', summonHpPct: 'spell', summonCrit: 'spell', summonGemLevel: 'spell',
    firePctDmg: 'fire', igniteChance: 'fire', coldPctDmg: 'cold', chillChance: 'cold',
    lightPctDmg: 'lightning', shockChance: 'lightning', elementalPctDmg: 'elemental',
    chaosPctDmg: 'chaos', resChaos: 'chaos', chaosGemLevel: 'chaos', poisonChance: 'ailment', dotPctDmg: 'ailment',
    mystique: 'mystique', devotion: 'devotion', cycle: 'cycle'
});
const LEGACY_RUNTIME_MAP = Object.freeze({
    critical_strike_chance: 'crit', critical_damage_multiplier: 'critDmg'
});
const COMPATIBLE_CATEGORY_FAMILIES = Object.freeze([
    new Set(['str', 'def', 'physical', 'atk']),
    new Set(['dex', 'def', 'physical', 'atk', 'cold']),
    new Set(['int', 'def', 'spell', 'chaos']),
    new Set(['dex', 'int', 'def', 'ailment', 'elemental', 'fire', 'cold', 'lightning', 'spell'])
]);

function actionableNodes(tree) {
    return tree.nodes.filter(node => ACTIONABLE_TYPES.has(node.type));
}

function canonicalMod(mod) {
    if (mod.statId === 'attribute') return { statId: mod.target, value: Number(mod.value) };
    if (mod.statId === 'damage_method') {
        const method = { projectile: 'projectilePctDmg', melee: 'meleePctDmg', area: 'aoePctDmg' };
        return { statId: method[mod.target] || mod.statId, value: Number(mod.value) };
    }
    return { statId: LEGACY_RUNTIME_MAP[mod.statId] || mod.statId, value: Number(mod.value) };
}

function suggestedRuntimeEffects(mod) {
    if (mod.statId === 'attribute' && mod.target === 'all') {
        return ['strength', 'dexterity', 'intelligence'].map(statId => ({ statId, value: Number(mod.value) }));
    }
    return [canonicalMod(mod)];
}

function currentPipelineSupports(mod) {
    if (mod.statId === 'attribute') return Boolean(STAT_META[mod.target]);
    if (mod.statId === 'damage_method') return ['projectile', 'melee', 'area'].includes(mod.target);
    return Boolean(STAT_META[mod.statId]);
}

function effectCategories(node) {
    return [...new Set((node.mods || []).map(mod => {
        if (mod.statId === 'attribute') return { strength: 'str', dexterity: 'dex', intelligence: 'int', all: 'attr' }[mod.target];
        if (mod.statId === 'damage_method') return 'atk';
        return CATEGORY_BY_STAT[mod.statId];
    }).filter(Boolean))];
}

function neighborCategoryVotes(node, graph, nodesById) {
    const votes = {};
    (graph.get(String(node.id)) || []).forEach(id => {
        const category = nodesById.get(id)?.cat;
        if (!category || category === 'none' || ATTRIBUTE_CATEGORIES.has(category)) return;
        votes[category] = (votes[category] || 0) + 1;
    });
    return votes;
}

function rankVotes(votes) {
    return Object.entries(votes).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

function tagDecision(node, graph, nodesById, baselineById) {
    const categories = effectCategories(node), votes = neighborCategoryVotes(node, graph, nodesById);
    const neighbor = rankVotes(votes)[0], primary = categories[0] || null;
    let confidence = categories.length === 1 ? 'high' : (categories.length > 1 ? 'medium' : 'manual');
    let reason = categories.length === 1 ? 'single-effect-family' : (categories.length > 1 ? 'multi-effect-family' : 'no-effect-family');
    let suggestedCat = primary;
    if (!suggestedCat && neighbor?.[1] >= 2) {
        suggestedCat = neighbor[0];
        confidence = 'medium';
        reason = 'neighbor-consensus';
    } else if (suggestedCat && neighbor?.[1] >= 2 && neighbor[0] !== suggestedCat) {
        confidence = 'manual';
        reason = 'effect-neighbor-conflict';
    }
    return {
        id: String(node.id), type: node.type, name: node.name, x: node.x, y: node.y,
        currentCat: node.cat, suggestedCat, confidence, reason, effectCategories: categories,
        neighborCategoryVotes: votes, previousCat: baselineById.get(String(node.id))?.cat || null,
        mods: node.mods || []
    };
}

function reviewMissingTags(tree, baseline) {
    const graph = buildGraph(tree), nodesById = new Map(tree.nodes.map(node => [String(node.id), node]));
    const baselineById = new Map((baseline?.nodes || []).map(node => [String(node.id), node]));
    const rows = actionableNodes(tree).filter(node => !isIntentionalNoEffectNode(node))
        .filter(node => !node.cat || node.cat === 'none')
        .map(node => tagDecision(node, graph, nodesById, baselineById));
    const byConfidence = countBy(rows, row => row.confidence);
    const bySuggestion = countBy(rows, row => row.suggestedCat || 'unresolved');
    return { count: rows.length, byConfidence, bySuggestion, rows };
}

function descriptionLineCount(node) {
    return String(node.desc || '').split(/\r?\n/).filter(line => line.trim()).length;
}

function reviewDescriptions(tree) {
    const lineCountMismatches = actionableNodes(tree).filter(node =>
        !isAllAttributesEffects(node.mods) && descriptionLineCount(node) !== (Array.isArray(node.mods) ? node.mods.length : 0))
        .map(node => pickNode(node, { descriptionLines: descriptionLineCount(node) }));
    const evasionUnitMismatches = actionableNodes(tree).filter(node => {
        const lines = String(node.desc || '').split(/\r?\n/).filter(line => line.trim());
        return (node.mods || []).some((mod, index) => mod.statId === 'evasion' && /%/.test(lines[index] || ''));
    })
        .map(node => pickNode(node));
    return {
        lineCountMismatches: { count: lineCountMismatches.length, rows: lineCountMismatches },
        evasionUnitMismatches: { count: evasionUnitMismatches.length, rows: evasionUnitMismatches }
    };
}

function reviewRuntimeSupport(tree) {
    const unsupported = [], legacyConversions = [];
    actionableNodes(tree).forEach(node => (node.mods || []).forEach((mod, modIndex) => {
        const row = { id: String(node.id), name: node.name, cat: node.cat, modIndex,
            statId: mod.statId, target: mod.target || null, value: mod.value,
            suggestedRuntimeEffects: suggestedRuntimeEffects(mod) };
        if (!STAT_META[mod.statId]) legacyConversions.push(row);
        if (!currentPipelineSupports(mod)) unsupported.push(row);
    }));
    const stale = actionableNodes(tree).filter(node => {
        const mods = (node.mods || []).flatMap(suggestedRuntimeEffects);
        const runtime = (node.runtimeEffects || []).map(effect => ({ statId: effect.statId, value: Number(effect.value) }));
        return JSON.stringify(mods) !== JSON.stringify(runtime);
    }).map(node => ({ ...pickNode(node), canonicalMods: (node.mods || []).flatMap(suggestedRuntimeEffects),
        runtimeEffects: node.runtimeEffects || [] }));
    return { unsupportedByCurrentPipeline: { count: unsupported.length, rows: unsupported },
        legacyConversions: { count: legacyConversions.length, rows: legacyConversions },
        staleRuntimeEffects: { count: stale.length, rows: stale } };
}

function bundleCenter(nodes) {
    return {
        x: Math.round(nodes.reduce((sum, node) => sum + Number(node.x), 0) / nodes.length),
        y: Math.round(nodes.reduce((sum, node) => sum + Number(node.y), 0) / nodes.length)
    };
}

function classifyMixedBundle(nodes, categories) {
    const counts = countBy(nodes.filter(node => node.cat !== 'none'), node => node.cat);
    const rare = Object.entries(counts).sort((left, right) => left[1] - right[1])[0];
    const rareNodes = nodes.filter(node => node.cat === rare?.[0]);
    if (rare?.[1] === 1 && ATTRIBUTE_CATEGORIES.has(rare[0])) return 'compatible-attribute-connector';
    if (rare?.[1] === 1 && rareNodes[0]?.type === 'major'
        && (rareNodes[0].mods || []).some(mod => ['mystique', 'devotion', 'cycle'].includes(mod.statId))) {
        return 'compatible-hybrid-major';
    }
    if (COMPATIBLE_CATEGORY_FAMILIES.some(family => categories.every(category => family.has(category)))) {
        return 'compatible-related-family';
    }
    if (categories.includes('mystique') || categories.includes('devotion') || categories.includes('cycle')) {
        return 'manual-special-transition';
    }
    return 'manual-incoherent-family';
}

function reviewMixedBundles(tree) {
    const audit = visualBundleAudit(tree), topology = classifyPassiveTreeTopology(tree);
    const nodesById = new Map(tree.nodes.map(node => [String(node.id), node]));
    const rows = audit.bundles.map(bundle => bundle.ids.map(id => nodesById.get(id))).map(nodes => {
        const categories = [...new Set(nodes.map(node => node.cat).filter(cat => cat && cat !== 'none'))];
        if (categories.length < 2) return null;
        const topologyRoles = new Set(nodes.map(node => topology.corridorIds.has(String(node.id)) ? 'corridor' : 'bundle'));
        return { center: bundleCenter(nodes), categories: countBy(nodes.filter(node => node.cat !== 'none'), node => node.cat),
            classification: topologyRoles.size === 1 && topologyRoles.has('corridor') ? 'compatible-corridor-stats'
                : topologyRoles.size > 1 ? 'compatible-topology-transition'
                : classifyMixedBundle(nodes, categories), nodes: nodes.map(node => pickNode(node)) };
    }).filter(Boolean);
    return { count: rows.length, byClassification: countBy(rows, row => row.classification), rows };
}

function modSignature(node) {
    return JSON.stringify((node.mods || []).map(mod => ({ statId: mod.statId, target: mod.target || null, value: Number(mod.value) })));
}

function isUniformSpecialBundle(nodes) {
    const category = nodes[0]?.cat;
    if (!SPECIAL_CATEGORIES.has(category)) return false;
    return nodes.every(node => node.cat === category && node.mods?.length === 1
        && node.mods[0].statId === category);
}

function choiceRecommendation(nodes) {
    const statId = nodes[0]?.mods?.[0]?.statId;
    if (statId === 'mystique') return '신비 유지 + 중독/지속 피해/치명타 중 갈래별 보조 효과';
    if (statId === 'devotion') return '계시 유지 + 생명/저항/피해 중 갈래별 보조 효과';
    if (statId === 'cycle') return '순환 유지 + 이동/재생/스킬 속도 중 갈래별 보조 효과';
    if (statId === 'damage_method') return '투사체 피해 유지 + 정확도/공속/치명타/추가 투사체 역할 분리';
    return '주요 노드와 양쪽 갈래에 서로 다른 보조 효과 배정';
}

function reviewIdenticalBundles(tree) {
    const audit = visualBundleAudit(tree), nodesById = new Map(tree.nodes.map(node => [String(node.id), node]));
    const rows = audit.bundles.map(bundle => bundle.ids.map(id => nodesById.get(id)))
        .filter(nodes => !nodes.every(isIntentionalNoEffectNode))
        .filter(nodes => !isUniformSpecialBundle(nodes))
        .filter(nodes => new Set(nodes.map(modSignature)).size === 1).map(nodes => ({
        center: bundleCenter(nodes), size: nodes.length, effect: nodes[0].mods || [],
        recommendation: choiceRecommendation(nodes), nodes: nodes.map(node => pickNode(node))
    }));
    return { count: rows.length, rows };
}

function pickNode(node, extra = {}) {
    return { id: String(node.id), type: node.type, cat: node.cat, name: node.name,
        desc: node.desc, mods: node.mods || [], x: node.x, y: node.y, ...extra };
}

function countBy(rows, selector) {
    return Object.fromEntries(Object.entries(rows.reduce((counts, row) => {
        const key = selector(row);
        counts[key] = (counts[key] || 0) + 1;
        return counts;
    }, {})).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function reviewTree(tree, baseline = null) {
    const missingTags = reviewMissingTags(tree, baseline);
    const descriptions = reviewDescriptions(tree);
    const runtime = reviewRuntimeSupport(tree);
    const mixedBundles = reviewMixedBundles(tree);
    const identicalBundles = reviewIdenticalBundles(tree);
    const shortBranchChoices = auditShortBranchChoices(tree);
    return {
        sourceSummary: { nodes: tree.nodes.length, edges: tree.edges.length, actionable: actionableNodes(tree).length },
        reviewOrder: ['missingTags', 'descriptions', 'runtime', 'mixedBundles', 'identicalBundles', 'shortBranchChoices'],
        summary: {
            missingTags: missingTags.count,
            descriptionLineCountMismatches: descriptions.lineCountMismatches.count,
            evasionUnitMismatches: descriptions.evasionUnitMismatches.count,
            unsupportedMods: runtime.unsupportedByCurrentPipeline.count,
            staleRuntimeEffects: runtime.staleRuntimeEffects.count,
            mixedBundles: mixedBundles.count,
            manualMixedBundles: mixedBundles.rows.filter(row => row.classification.startsWith('manual-')).length,
            identicalBundles: identicalBundles.count,
            dominatedShortBranches: shortBranchChoices.count
        },
        missingTags, descriptions, runtime, mixedBundles, identicalBundles, shortBranchChoices
    };
}

function writeJson(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function main() {
    const [sourceFile, baselineFile, outputFile] = process.argv.slice(2);
    if (!sourceFile || !outputFile) {
        throw new Error('사용법: node scripts/review-passive-tree-source.js <source.json> <baseline.json|-> <report.json>');
    }
    const source = readTree(sourceFile), baseline = baselineFile === '-' ? null : readTree(baselineFile);
    const report = reviewTree(source, baseline);
    writeJson(outputFile, { source: path.resolve(sourceFile), baseline: baselineFile === '-' ? null : path.resolve(baselineFile), ...report });
    console.log(JSON.stringify(report.summary, null, 2));
}

if (require.main === module) main();

module.exports = { canonicalMod, reviewTree };
