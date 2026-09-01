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
    handleTalentBloomClear(getZone('trial_5'));
`, context);

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
assert.deepStrictEqual(second.combos, ['hero10__warrior', 'hero9__warrior'],
    'later clears may collect another talent card combination');
assert.strictEqual(second.talentId, 'hero10', 'later card clears must not morph allocated fifth-job nodes');
assert.strictEqual(second.ascendPoints, 2, 'new card combinations in the same loop must not farm ascendancy points');
assert.strictEqual(second.keystonePoints, 1, 'new card combinations in the same loop must not farm keystone points');
console.log('PASS talent bloom choice and once-per-loop specialization');
