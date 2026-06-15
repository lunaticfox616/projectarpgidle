#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const source = fs.readFileSync('data/rewards.js', 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);
const rewards = sandbox.window.ACT_REWARD_DB;
assert(rewards, 'act reward database must be exposed');
const act4 = rewards[3];
assert(act4, 'act 4 reward config must exist');
const byStat = Object.fromEntries(act4.choices.map(choice => [choice.stat, choice]));
assert.strictEqual(byStat.resF.value, 9, 'act 4 fire resistance reward must be +9%');
assert.strictEqual(byStat.resC.value, 9, 'act 4 cold resistance reward must be +9%');
assert.strictEqual(byStat.resL.value, 9, 'act 4 lightning resistance reward must be +9%');
assert.strictEqual(byStat.resAll.value, 3, 'act 4 all elemental resistance reward must be +3%');
assert(byStat.resAll.label.includes('모든 원소 저항 +3%'), 'act 4 all elemental resistance reward label must be player-facing');
console.log('act reward smoke checks passed');
