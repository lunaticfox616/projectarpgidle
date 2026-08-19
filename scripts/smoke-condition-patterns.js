const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
  console,
  Date,
  JOURNAL_DB: { woodsman: { title: '나무꾼' }, cosmos_astra: { title: '아스트라' } },
  safeExposeData(values) { Object.assign(context, values); },
  safeExposeGlobals(values) { Object.assign(context, values); },
  gridChebyshevDist(ax, ay, bx, by) { return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); }
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('data/skills.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/condition-patterns.js', 'utf8'), context);

const oversizedCount = { triggerType:'enemy_many', triggerValue:40, actionType:'target_weakest' };
context.normalizeConditionPatternRule(oversizedCount);
assert.strictEqual(oversizedCount.triggerValue, 30, 'count conditions must clamp migrated values to the UI contract');

context.game = {
  season: 2,
  loopCount: 1,
  playerHp: 30,
  playerEnergyShield: 10,
  gridPlayer: { gx: 0, gy: 0 },
  playerAilments: [],
  journalEntries: [],
  claimedActRewards: [2],
  enemies: [{ id: 1, hp: 100, maxHp: 100, gx: 4, gy: 0 }],
  skillAutoRules: []
};
const stats = { maxHp: 100, energyShield: 50 };

assert(context.getConditionPatternTriggers(context.game, false).some(row => row.id === 'hp_below'), 'base HP condition must unlock with condition gems');
assert(!context.getConditionPatternTriggers(context.game, false).some(row => row.id === 'elite_present'), 'elite condition must remain locked before loop 5');
assert(context.evaluateConditionPatternRule({ triggerType: 'hp_below', triggerValue: 35 }, stats, context.game, Date.now()), 'HP threshold must evaluate against current life');
assert(!context.evaluateConditionPatternRule({ triggerType: 'hp_below', triggerValue: 20 }, stats, context.game, Date.now()), 'HP threshold must reject unmet values');

const legacy = context.normalizeConditionPatternRule({ triggerType: 'enemy_many', hpThreshold: 3, skillName: '전장의 함성' });
assert.strictEqual(legacy.actionType, 'condition_gem', 'legacy rules must migrate to condition gem actions');
assert.strictEqual(legacy.triggerValue, 3, 'legacy hpThreshold must migrate without changing its threshold');

context.game.season = 10;
context.game.enemies = [
  { id: 1, hp: 100, maxHp: 100, gx: 4, gy: 0, isElite: true },
  { id: 2, hp: 60, maxHp: 100, gx: 5, gy: 1 }
];
assert(context.evaluateConditionPatternRule({ triggerType: 'elite_present', triggerValue: 1 }, stats, context.game, Date.now()), 'elite trigger must detect a live elite');
assert(context.evaluateConditionPatternRule({ triggerType: 'distance_at_least', triggerValue: 4 }, stats, context.game, Date.now()), 'distance trigger must use the nearest enemy');

context.game.skillAutoRules = [
  { enabled: true, priority: 1, triggerType: 'elite_present', actionType: 'target_dangerous' },
  { enabled: true, priority: 2, triggerType: 'distance_at_least', triggerValue: 3, actionType: 'position_keep_range' }
];
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.resolveConditionalCombatTactics({ targetPriority: 'nearest', positionMode: 'auto' }, stats, context.game, Date.now()))),
  { targetPriority: 'dangerous', positionMode: 'keepRange' },
  'matching rules must independently override target and position tactics'
);

context.game.season = 5;
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.resolveConditionalCombatTactics({ targetPriority: 'nearest', positionMode: 'auto' }, stats, context.game, Date.now()))),
  { targetPriority: 'nearest', positionMode: 'auto' },
  'locked actions must never affect combat even when a saved rule references them'
);

console.log('smoke-condition-patterns: ok');
