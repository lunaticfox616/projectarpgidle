#!/usr/bin/env node
'use strict';

const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
vm.runInContext(`
    addLog = function () {};
    startMoving = function () {};
    updateStaticUI = function () {};
    queueImportantSave = function () {};
    queueTutorialNotice = function () {};
    dispatchRuntimeEvent = function () {};
    game.currencies.chaosKey = 2;
    game.currencies.coreKey = 2;
    game.ascendClass = 'warrior';
    game.selectedHeroId = 'hero1';
    game.pendingTalentBloomHeroId = 'hero10';
    game.ascendPoints = 0;
    game.ascendKeystonePoints = 0;
    game.bloomLoopSpecGranted = null;
    game.bloomedClassThisLoop = null;
    game.bloomedTalentThisLoop = null;
    game.talentBloomCombos = [];
    game.talentCards = {};
    game.unlocks = {};
    game.noti = {};
    game.selectedHeroId = 'hero1';
    game.bloomedClassThisLoop = null;
    game.bloomedTalentThisLoop = null;
    game.__statsBeforeBloom = getPlayerStats();
    game.selectedHeroId = 'hero9';
    game.__statsAfterLegacyTalentChange = getPlayerStats();
    game.selectedHeroId = 'hero1';
    handleTalentBloomClear(getZone('trial_5'));
`, context);

const inactive = JSON.parse(vm.runInContext(`JSON.stringify({
    beforeDot: game.__statsBeforeBloom.dotPctDmg,
    afterDot: game.__statsAfterLegacyTalentChange.dotPctDmg,
    beforeEvasion: game.__statsBeforeBloom.evasionPct,
    afterEvasion: game.__statsAfterLegacyTalentChange.evasionPct
})`, context));
assert.strictEqual(inactive.afterDot, inactive.beforeDot,
    'the legacy selectedHeroId bridge must not act as an active talent before fifth ascension');
assert.strictEqual(inactive.afterEvasion, inactive.beforeEvasion,
    'changing the legacy hero bridge must not grant a talent stat bonus');

const first = JSON.parse(vm.runInContext(`JSON.stringify({
    combos: game.talentBloomCombos,
    classId: game.bloomedClassThisLoop,
    talentId: game.bloomedTalentThisLoop,
    ascendPoints: game.ascendPoints,
    keystonePoints: game.ascendKeystonePoints,
    pending: game.pendingTalentBloomHeroId,
    talentNodes: [getClassTreeDef('warrior').n13a, getClassTreeDef('warrior').n13b]
})`, context));
assert.deepStrictEqual(first.combos, ['hero10__warrior'], 'the explicitly chosen talent must form the bloom card key');
assert.strictEqual(first.classId, 'warrior');
assert.strictEqual(first.talentId, 'hero10', 'the first bloom must lock the fifth-job talent specialization');
assert.strictEqual(first.ascendPoints, 2);
assert.strictEqual(first.keystonePoints, 1);
assert.strictEqual(first.pending, null, 'the pending choice must be consumed after victory');
assert.deepStrictEqual(first.talentNodes.map(node => node.stat), ['dotPctDmg', 'evasionPct']);

vm.runInContext(`
    game.pendingTalentBloomHeroId = 'hero9';
    handleTalentBloomClear(getZone('trial_5'));
`, context);
const second = JSON.parse(vm.runInContext(`JSON.stringify({
    combos: game.talentBloomCombos,
    classId: game.bloomedClassThisLoop,
    talentId: game.bloomedTalentThisLoop,
    ascendPoints: game.ascendPoints,
    keystonePoints: game.ascendKeystonePoints
})`, context));
assert.deepStrictEqual(second.combos, ['hero10__warrior'],
    'later clears in the same loop must keep using the talent chosen for fifth ascension');
assert.strictEqual(second.talentId, 'hero10', 'later clears must not change the loop bloom talent');
assert.strictEqual(second.ascendPoints, 2, 'new card combinations in the same loop must not farm ascendancy points');
assert.strictEqual(second.keystonePoints, 1, 'new card combinations in the same loop must not farm keystone points');

async function verifyFifthAscensionChoiceOverlay() {
    vm.runInContext(`
        game.selectedClassId = 'warrior';
        game.bloomedClassThisLoop = null;
        game.bloomedTalentThisLoop = null;
        game.__choiceConfig = null;
        requestGameChoice = async function (config) { game.__choiceConfig = config; return 'hero3'; };
    `, context);
    const chosen = await vm.runInContext('chooseTalentBloomHeroId()', context);
    const config = JSON.parse(vm.runInContext('JSON.stringify(game.__choiceConfig)', context));
    assert.strictEqual(chosen, 'hero3');
    assert.strictEqual(config.title, '5차 전직 · 개화 재능 선택');
    assert.strictEqual(config.choices.length, 10, 'fifth ascension must offer every bloom talent');
    assert.strictEqual(config.value, 'hero2', 'the overlay should initially focus the selected class recommendation');

    vm.runInContext(`
        game.bloomedClassThisLoop = 'warrior';
        game.bloomedTalentThisLoop = 'hero10';
        requestGameChoice = async function () { throw new Error('locked bloom must not reopen the overlay'); };
    `, context);
    assert.strictEqual(await vm.runInContext('chooseTalentBloomHeroId()', context), 'hero10',
        'the chosen bloom talent must remain fixed for the rest of the loop');

    vm.runInContext('triggerSeasonReset()', context);
    const resetState = JSON.parse(vm.runInContext(`JSON.stringify({
        classId: game.bloomedClassThisLoop,
        talentId: game.bloomedTalentThisLoop,
        pendingId: game.pendingTalentBloomHeroId
    })`, context));
    assert.deepStrictEqual(resetState, { classId: null, talentId: null, pendingId: null },
        'loop reset must remove the chosen bloom talent and its pending selection');
}

verifyFifthAscensionChoiceOverlay().then(() => {
    console.log('PASS talent bloom choice and once-per-loop specialization');
}).catch(error => {
    console.error(error);
    process.exitCode = 1;
});
