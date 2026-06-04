const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const match = combatSource.match(/function ensureNextEndlessChaosDepthUnlocked\(depth\) \{[\s\S]*?\n\}/);
assert(match, 'ensureNextEndlessChaosDepthUnlocked helper must exist');

const context = { game: { season: 18, abyssUnlockedDepths: [20, 21, 22, 23, 24, 25, 26, 27] } };
vm.createContext(context);
vm.runInContext(`${match[0]}; this.ensureNextEndlessChaosDepthUnlocked = ensureNextEndlessChaosDepthUnlocked;`, context);

const unlocked = context.ensureNextEndlessChaosDepthUnlocked(27);
assert.strictEqual(unlocked, 28, 'clearing deep chaos 27 should target floor 28 unlock');
assert(context.game.abyssUnlockedDepths.includes(28), 'floor 28 should be appended to unlocked depths');
assert.deepStrictEqual(Array.from(context.game.abyssUnlockedDepths), [20, 21, 22, 23, 24, 25, 26, 27, 28], 'unlocked depths should remain sorted and unique');

context.game.season = 9;
const before = Array.from(context.game.abyssUnlockedDepths);
assert.strictEqual(context.ensureNextEndlessChaosDepthUnlocked(28), 0, 'pre-loop-10 clears should not unlock endless floors');
assert.deepStrictEqual(Array.from(context.game.abyssUnlockedDepths), before, 'pre-loop-10 call should not mutate unlocked depths');


const branchContext = { game: { season: 11, abyssEndlessDepth: 31, abyssUnlockedDepths: [20, 21, 31] } };
vm.createContext(branchContext);
vm.runInContext(`${match[0]}; const depth = 21; let nowEndless = Math.max(20, depth, Math.floor(game.abyssEndlessDepth || depth)); ensureNextEndlessChaosDepthUnlocked(nowEndless); game.abyssEndlessDepth = nowEndless;`, branchContext);
assert.strictEqual(branchContext.game.abyssEndlessDepth, 31, 'clearing a lower loop cap should preserve the higher recorded endless depth');
assert(branchContext.game.abyssUnlockedDepths.includes(32), 'continuing from a preserved higher depth should have the next higher floor unlocked');

console.log('deep chaos unlock smoke checks passed');
