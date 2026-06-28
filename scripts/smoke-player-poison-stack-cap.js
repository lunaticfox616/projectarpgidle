#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const exposed = {};
const context = {
  console,
  window: {},
  game: { playerAilments: [], settings: {} },
  Math: Object.create(Math),
  safeExposeGlobals(obj) {
    Object.assign(exposed, obj);
    Object.assign(context, obj);
    Object.assign(context.window, obj);
  },
};
context.window = context;
context.Math.random = () => 0.99;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(repoRoot, 'js/combat.js'), 'utf8'), context, { filename: 'js/combat.js' });

const pStats = {
  ailResPoison: 0,
  ailmentResistBonusPct: 0,
  uniquePoisonExtraStacks: 1,
};

exposed.applyPlayerAilment('poison', 3, 0.9, pStats, 100, { ailmentSourceDamage: 100 });
exposed.applyPlayerAilment('poison', 5, 0.9, pStats, 200, { ailmentSourceDamage: 200 });

const poisonRows = context.game.playerAilments.filter(row => row && row.type === 'poison');
assert.strictEqual(poisonRows.length, 1, 'player poison must stay at one stack without a dedicated player poison cap stat');
assert.strictEqual(poisonRows[0].time, 5, 'refreshing player poison should update the existing row duration');
assert.strictEqual(poisonRows[0].sourceHitDamage, 200, 'stronger incoming poison should replace the stored damage on the existing row');
assert.strictEqual(context.getEnemyDamageAilmentMaxStacks('poison', pStats), 2, 'offensive poison stack bonuses must still increase enemy poison cap');
assert.strictEqual(context.getEnemyDamageAilmentMaxStacks('ignite', pStats), 1, 'poison-specific stack bonuses must not increase other damage ailment caps');
const spreadPoison = { type: 'poison', time: 3, power: 0.9, stacks: 2, sourceHitDamage: 100, critDotBonusPct: 0, ailmentDotScore: 100 };
assert.strictEqual(context.cloneEnemyAilmentForSpread(spreadPoison, pStats).stacks, 2, 'poison spread clone must preserve offensive extra stacks with player stats');
const target = { ailments: [{ type: 'poison', time: 1, power: 0.5, stacks: 1 }] };
context.mergeEnemyAilment(target, spreadPoison, pStats);
assert.strictEqual(target.ailments[0].stacks, 2, 'poison spread merge must preserve offensive extra stacks with player stats');

console.log('player poison stack cap smoke checks passed');
