#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const match = combatSource.match(/function unlockConditionGemsAfterRootBossClear\(\) \{[\s\S]*?\n\}/);
assert(match, 'unlockConditionGemsAfterRootBossClear helper must exist');
const seasonBossBranch = combatSource.match(/if \(zone\.type === 'seasonBoss'\) \{[\s\S]*?if \(Math\.random\(\) < 0\.5\)/);
assert(seasonBossBranch, 'season boss reward branch must exist');
assert(seasonBossBranch[0].includes('unlockConditionGemsAfterRootBossClear();'), 'every season boss clear must run the condition gem unlock check');

const logs = [];
const context = {
  game: {
    season: 3,
    conditionGemUnlocked: false,
    clearedRootBosses: ['s2_boss_flame'],
  },
  addLog(message, type) {
    logs.push({ message, type });
  },
};
vm.createContext(context);
vm.runInContext(`${match[0]}; this.unlockConditionGemsAfterRootBossClear = unlockConditionGemsAfterRootBossClear;`, context);

assert.strictEqual(context.unlockConditionGemsAfterRootBossClear(), true, 'a later loop must re-unlock condition gems even when that boss was cleared before');
assert.strictEqual(context.game.conditionGemUnlocked, true, 'condition gem system should be unlocked');
assert.strictEqual(logs.length, 1, 'unlock should log exactly once');

assert.strictEqual(context.unlockConditionGemsAfterRootBossClear(), false, 'an already unlocked system should not unlock twice');
assert.strictEqual(logs.length, 1, 'repeat boss clears in the same loop should not duplicate the unlock log');

context.game = { season: 1, conditionGemUnlocked: false, clearedRootBosses: [] };
assert.strictEqual(context.unlockConditionGemsAfterRootBossClear(), false, 'root bosses before loop 2 should not unlock condition gems');
assert.strictEqual(context.game.conditionGemUnlocked, false, 'pre-loop-2 state should remain locked');

console.log('condition gem re-unlock smoke checks passed');
