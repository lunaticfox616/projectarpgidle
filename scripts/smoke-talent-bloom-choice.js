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
// 2026-10-02 재능 정리: 개화 재능은 전직이 속한 직업의 대표 재능(워리어는 전사 직업 → 전사 재능 hero2). 남아 있던 다른 선택은 쓰지 않는다.
assert.deepStrictEqual(first.combos, ['hero2__warrior'], 'the class talent forms the bloom card key');
assert.strictEqual(first.classId, 'warrior');
assert.strictEqual(first.talentId, 'hero2', 'the first bloom locks the class talent specialization');
assert.strictEqual(first.ascendPoints, 2);
assert.strictEqual(first.keystonePoints, 1);
assert.strictEqual(first.pending, null, 'the pending choice must be consumed after victory');
assert.deepStrictEqual(first.talentNodes.map(node => node.stat), ['physPctDmg', 'pctHp'], 'n13a and n13b follow the class talent');

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
assert.deepStrictEqual(second.combos, ['hero2__warrior'],
    'later clears in the same loop keep the class talent card');
assert.strictEqual(second.talentId, 'hero2', 'later clears must not change the loop bloom talent');
assert.strictEqual(second.ascendPoints, 2, 'new card combinations in the same loop must not farm ascendancy points');
assert.strictEqual(second.keystonePoints, 1, 'new card combinations in the same loop must not farm keystone points');

async function verifyFifthAscensionChoiceOverlay() {
    vm.runInContext(`
        game.selectedClassId = 'warrior';
        game.bloomedClassThisLoop = null;
        game.bloomedTalentThisLoop = null;
        game.__choiceConfig = null;
        requestGameChoice = async function () { throw new Error('the bloom must not ask for a talent (2026-10-02 talent cleanup)'); };
    `, context);
    for (const [ascend, talent] of [['warrior', 'hero2'], ['ranger', 'hero1'], ['soulbinder', 'hero9'], ['grovewarden', 'hero10']]) {
        vm.runInContext(`game.ascendClass = '${ascend}';`, context);
        assert.strictEqual(await vm.runInContext('chooseTalentBloomHeroId()', context), talent, `${ascend}: the class talent, no choice`);
    }
    vm.runInContext("game.ascendClass = 'warrior';", context);

    vm.runInContext(`
        game.bloomedClassThisLoop = 'warrior';
        game.bloomedTalentThisLoop = 'hero10';
        requestGameChoice = async function () { throw new Error('a bloomed loop must not open a talent choice'); };
    `, context);
    assert.strictEqual(await vm.runInContext('chooseTalentBloomHeroId()', context), 'hero2',
        'an old talent left in the loop state does not replace the class talent');

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
