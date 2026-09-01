#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { normalizeAuthoringTree } = require('./lib/passive-tree-authoring-normalizer');

const STAT_CATALOG = Object.freeze({
    strength: { name: '힘', isPct: false }, evasion: { name: '회피', isPct: false },
    evasionPct: { name: '회피(%)', isPct: true }, chaosPctDmg: { name: '카오스 피해(%)', isPct: true },
    crit: { name: '치명타 확률(%)', isPct: true }
});

function node(id, mods, extra = {}) {
    return { id, type: 'minor', cat: 'none', name: '', desc: '', mods,
        runtimeEffects: [], x: 0, y: 0, ...extra };
}

function normalize(nodes, options = {}) {
    return normalizeAuthoringTree({ nodes, edges: [] }, {
        statCatalog: STAT_CATALOG,
        runtimeSyncIds: new Set(options.runtimeSyncIds || []),
        descriptionRepairIds: new Set(options.descriptionRepairIds || []),
        bridgeNodeIds: new Set(options.bridgeNodeIds || []),
        authoredCorrections: options.authoredCorrections || {}
    }).tree.nodes;
}

function testModsAreAuthoritative() {
    const [result] = normalize([node('chaos', [{ statId: 'damage_type', target: 'chaos', value: 15 }], {
        runtimeEffects: [{ statId: 'chaosPctDmg', value: 7 }]
    })], { runtimeSyncIds: ['chaos'] });
    assert.deepStrictEqual(result.mods, [{ statId: 'chaosPctDmg', value: 15 }]);
    assert.deepStrictEqual(result.runtimeEffects, result.mods);
    assert.strictEqual(result.desc, '카오스 피해 +15%');
    assert.strictEqual(result.cat, 'chaos');
}

function testCriticalAliasAndEvasionUnits() {
    const results = normalize([
        node('crit', [{ statId: 'critical_strike_chance', value: 2 }]),
        node('flat', [{ statId: 'evasion', value: 14 }]),
        node('pct', [{ statId: 'evasionPct', value: 14 }])
    ], { runtimeSyncIds: ['crit'], descriptionRepairIds: ['flat', 'pct'] });
    assert.deepStrictEqual(results[0].mods, [{ statId: 'crit', value: 2 }]);
    assert.strictEqual(results[1].desc, '회피 +14');
    assert.strictEqual(results[2].desc, '회피 +14%');
}

function testIntentionalNoEffectIsPreserved() {
    const original = node('nr79xrtmmci', [], { intentionalNoEffect: true });
    const [result] = normalize([original], { descriptionRepairIds: ['nr79xrtmmci'] });
    assert.deepStrictEqual(result, original);
}

function testBridgeGetsStrength() {
    const [result] = normalize([node('bridge', [])], { bridgeNodeIds: ['bridge'] });
    assert.strictEqual(result.name, '힘');
    assert.strictEqual(result.desc, '힘 +5');
    assert.deepStrictEqual(result.runtimeEffects, [{ statId: 'strength', value: 5 }]);
}

function testAuthoredCorrectionReplacesAllEffectSurfaces() {
    const [result] = normalize([node('summon', [{ statId: 'resPen', value: 2 }], {
        cat: 'elemental', runtimeEffects: [{ statId: 'resPen', value: 2 }]
    })], { authoredCorrections: { summon: { cat: 'spell', name: '소환수 피해', archetype: 'summon',
        mods: [{ statId: 'summonPctDmg', value: 6 }] } } });
    assert.strictEqual(result.cat, 'spell');
    assert.strictEqual(result.name, '소환수 피해');
    assert.strictEqual(result.archetype, 'summon');
    assert.deepStrictEqual(result.runtimeEffects, [{ statId: 'summonPctDmg', value: 6 }]);
}

testModsAreAuthoritative();
testCriticalAliasAndEvasionUnits();
testIntentionalNoEffectIsPreserved();
testBridgeGetsStrength();
testAuthoredCorrectionReplacesAllEffectSurfaces();
console.log('PASS passive tree authoring normalizer');
