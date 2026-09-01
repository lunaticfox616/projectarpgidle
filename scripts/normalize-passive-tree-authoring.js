#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { readTree, summarize } = require('./audit-passive-tree-source');
const { buildGameRuntime } = require('./lib/game-runtime');
const { CENTRAL_VOID_NO_EFFECT_NODE_IDS } = require('./lib/passive-tree-intent');
const { normalizeAuthoringTree } = require('./lib/passive-tree-authoring-normalizer');
const { applyPassiveKeystoneContracts } = require('./lib/passive-tree-keystone-contracts');
const { reviewTree } = require('./review-passive-tree-source');

const BRIDGE_NODE_IDS = new Set(['n0wqt7s7pj9', 'nz9ui037q0r']);
const AUTHORED_CORRECTIONS = Object.freeze({
    backbone_branch_occultist_outer_4_t1_n01: correction('occultist_outer_4', 'occultist_summon',
        'spell', '소환수 피해', 'summon', [{ statId: 'summonPctDmg', value: 6 }]),
    backbone_branch_occultist_outer_4_t1_n03: correction('occultist_outer_4', 'occultist_summon',
        'spell', '소환수 생명력', 'summon', [{ statId: 'summonHpPct', value: 5 }]),
    backbone_branch_alchemist_outer_3_t2_n02: correction('alchemist_outer_3', 'alchemist_lightning',
        'lightning', '감전 확률', 'lightning', [{ statId: 'shockChance', value: 3 }]),
    backbone_branch_alchemist_outer_3_t2_n04: correction('alchemist_outer_3', 'alchemist_lightning',
        'lightning', '폭풍 약제', 'lightning', [
            { statId: 'lightPctDmg', value: 30 }, { statId: 'shockChance', value: 15 }
        ], false),
    backbone_branch_alchemist_outer_3_t2_n06: correction('alchemist_outer_3', 'alchemist_lightning',
        'lightning', '번개 피해', 'lightning', [{ statId: 'lightPctDmg', value: 5 }]),
    backbone_branch_wanderer_outer_3_t1_n01: correction('wanderer_outer_3', 'wanderer_chaos',
        'chaos', '카오스 피해', 'chaos', [{ statId: 'chaosPctDmg', value: 5 }]),
    backbone_branch_wanderer_outer_3_t1_n03: correction('wanderer_outer_3', 'wanderer_chaos',
        'chaos', '카오스 피해', 'chaos', [{ statId: 'chaosPctDmg', value: 5 }]),
    backbone_branch_wanderer_outer_3_t1_n05: correction('wanderer_outer_3', 'wanderer_chaos',
        'chaos', '카오스 피해', 'chaos', [{ statId: 'chaosPctDmg', value: 5 }]),
    n9iiw9wl9k2: balanceCorrection('atk', '맹렬한 칼끝', 'melee', '급소 절개', [
        { statId: 'meleePctDmg', value: 12 }, { statId: 'crit', value: 2.5 }
    ]),
    n0b6pnemm4s: balanceCorrection('physical', '철벽의 격돌', 'physical', '철을 가르는 힘', [
        { statId: 'physPctDmg', value: 15 }, { statId: 'physIgnore', value: 3 }
    ]),
    n1ff9svkw0a: balanceCorrection('def', '굳건한 진군', 'armor', '굳건한 진군', [
        { statId: 'blockChance', value: 1.5 }
    ]),
    nsi1cc6xdjs: balanceCorrection('cold', '촉매의 설화', 'cold', '냉기 관통', [
        { statId: 'coldPctDmg', value: 12 }, { statId: 'resPen', value: 3 }
    ]),
    n69zy7h1xp6: balanceCorrection('chaos', '차원의 왜곡', 'chaos', '심연의 침식', [
        { statId: 'chaosPctDmg', value: 15 }, { statId: 'resPen', value: 3 }
    ]),
    'v13_bulk_방랑자_4_12': balanceCorrection('atk', '그림자의 연격', 'melee', '날 선 일격', [
        { statId: 'meleePctDmg', value: 15 }, { statId: 'flatDmg', value: 6 }
    ]),
    nkkj7rjjihu: balanceCorrection('atk', '수호의 방패', 'shield', '반격 방벽', [
        { statId: 'shieldPctDmg', value: 12 }, { statId: 'blockChance', value: 3 }
    ]),
    n313c5ajjtn: balanceCorrection('spell', '굳건한 주문핵', 'spell', '고등 마도', [
        { statId: 'spellPctDmg', value: 12 }, { statId: 'gemLevel', value: 1 }
    ]),
    nrfru36es1v: balanceCorrection('dex', '흔적 없는 몸놀림', 'evasion', '흐르는 몸놀림', [
        { statId: 'evasion', value: 40 }, { statId: 'evasionPct', value: 12 }
    ]),
    expansion_occult_grimoire_20: balanceCorrection('mystique', '봉인된 주문핵', 'spell',
        'authored:봉인된 주문핵', [
            { statId: 'spellPctDmg', value: 15 }, { statId: 'mystique', value: -1 },
            { statId: 'gemLevel', value: 1 }
        ])
});

function correction(group, theme, cat, name, archetype, mods, statAutoName = true) {
    const profile = `expansion:v30:${theme}`;
    return { cat, name, archetype, mods, statAutoName, optionProfile: profile,
        sourceOptionProfiles: [profile], optionClusterId: `cluster:backbone_branch_${group}:theme:${theme}` };
}

function balanceCorrection(cat, name, archetype, optionProfile, mods) {
    return { cat, name, archetype, optionProfile, mods, statAutoName: false };
}

function statCatalogFromRuntime() {
    const context = buildGameRuntime();
    const source = 'JSON.stringify(Object.fromEntries(Object.entries(P_STATS)'
        + '.map(([id, definition]) => [id, { name: definition.name || id, isPct: !!definition.isPct }])))';
    return JSON.parse(vm.runInContext(source, context));
}

function idSet(rows) {
    return new Set(rows.map(row => String(row.id)));
}

function normalizationOptions(sourceReview) {
    const runtimeSyncIds = idSet(sourceReview.runtime.staleRuntimeEffects.rows);
    const descriptionRepairIds = idSet([
        ...sourceReview.descriptions.lineCountMismatches.rows,
        ...sourceReview.descriptions.evasionUnitMismatches.rows
    ]);
    return { runtimeSyncIds, descriptionRepairIds, bridgeNodeIds: BRIDGE_NODE_IDS,
        authoredCorrections: AUTHORED_CORRECTIONS,
        statCatalog: statCatalogFromRuntime() };
}

function nodeShape(node) {
    return { id: String(node.id), x: node.x, y: node.y, type: node.type };
}

function validatePreservedStructure(source, output) {
    assert.deepStrictEqual(output.nodes.map(nodeShape), source.nodes.map(nodeShape), '노드 구조가 바뀌었습니다.');
    assert.deepStrictEqual(output.edges, source.edges, '연결선이 바뀌었습니다.');
    assert.deepStrictEqual(summarize(output).graph, summarize(source).graph, '그래프 연결성이 바뀌었습니다.');
}

function validateIntentionalNoEffects(source, output) {
    const sourceById = new Map(source.nodes.map(node => [String(node.id), node]));
    const outputById = new Map(output.nodes.map(node => [String(node.id), node]));
    CENTRAL_VOID_NO_EFFECT_NODE_IDS.forEach(id => {
        assert.deepStrictEqual(outputById.get(id), sourceById.get(id), `공허 인접 무효 노드가 바뀌었습니다: ${id}`);
    });
}

function validateResult(source, output) {
    validatePreservedStructure(source, output);
    validateIntentionalNoEffects(source, output);
    const review = reviewTree(output);
    assert.strictEqual(review.missingTags.count, 0, '효과 태그가 비어 있는 노드가 남았습니다.');
    assert.strictEqual(review.descriptions.lineCountMismatches.count, 0, '설명 줄 불일치가 남았습니다.');
    assert.strictEqual(review.descriptions.evasionUnitMismatches.count, 0, '회피 단위 불일치가 남았습니다.');
    assert.strictEqual(review.runtime.staleRuntimeEffects.count, 0, '실제 적용값 불일치가 남았습니다.');
    return review;
}

function writeJson(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function main() {
    const [sourceFile, outputFile, reportFile] = process.argv.slice(2);
    if (!sourceFile || !outputFile || !reportFile) {
        throw new Error('사용법: node scripts/normalize-passive-tree-authoring.js <source.json> <output.json> <report.json>');
    }
    const source = readTree(sourceFile), sourceReview = reviewTree(source);
    const result = normalizeAuthoringTree(source, normalizationOptions(sourceReview));
    result.report.keystoneContracts = applyPassiveKeystoneContracts(result.tree);
    const finalReview = validateResult(source, result.tree);
    writeJson(outputFile, result.tree);
    writeJson(reportFile, { source: path.resolve(sourceFile), output: path.resolve(outputFile),
        changes: result.report, before: sourceReview.summary, after: finalReview.summary });
    console.log(JSON.stringify({ changes: Object.fromEntries(Object.entries(result.report)
        .map(([key, rows]) => [key, rows.length])), before: sourceReview.summary, after: finalReview.summary }, null, 2));
}

if (require.main === module) main();

module.exports = { normalizationOptions, validateResult };
