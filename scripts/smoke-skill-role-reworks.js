#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
function extractFunction(name) {
  const start = combatSource.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} must exist`);
  const bodyStart = combatSource.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < combatSource.length; index++) {
    if (combatSource[index] === '{') depth++;
    if (combatSource[index] !== '}') continue;
    if (--depth === 0) return combatSource.slice(start, index + 1);
  }
  throw new Error(`${name} body is incomplete`);
}

const dataContext = { window: {} };
vm.createContext(dataContext);
vm.runInContext(fs.readFileSync('data/skills.js', 'utf8'), dataContext);
const skills = dataContext.window.SKILL_DB;
const game = { activeSkill: '', enemies: [], currentZoneId: 1 };
const context = {
  Math, Number, Array, Object, Set, Map, SKILL_DB: skills, game,
  DOT_STACK_MAX: 5, DOT_STACK_GROWTH_PER_STACK: 0.18, DOT_TICK_FROM_HIT_RATIO: 0.2,
  DOT_TICK_INTERVAL: 1, DOT_EFFECT_DURATION: 4,
  getZone: () => ({ tier: 1 }), getEffectiveEnemyMitigation: () => 0,
  applyDamageToEnemyResource(enemy, damage) { const dealt = Math.min(enemy.hp, damage); enemy.hp -= dealt; return dealt; },
  handleEnemyDeath(enemy) { game.enemies = game.enemies.filter(row => row.id !== enemy.id); },
};
vm.createContext(context);
[
  'getDotStackMultiplier', 'applyEnemyDotFromHit', 'getSkillAilmentStats',
  'getSkillConditionalDamageMultiplier', 'isDamageAilmentType', 'getEnemyDamageAilmentMaxStacks',
  'getStoredAilmentHitDamage', 'cloneEnemyAilmentForSpread', 'mergeEnemyAilment',
  'spreadSkillAilmentOnHit', 'applySkillPeriodicOnHit', 'tickEnemySkillPeriodicEffects',
  'transferSkillDotOnDeath', 'getSkillTargets'
].forEach(name => vm.runInContext(`${extractFunction(name)}; this.${name} = ${name};`, context));

function enemy(id, hp = 1000) { return { id, hp, maxHp: 1000, ailments: [], marker: id }; }
function withRandom(value, callback) {
  const original = Math.random;
  Math.random = () => value;
  try { callback(); } finally { Math.random = original; }
}

const flame = skills['화염 참격'];
const clean = enemy(1);
const burning = enemy(2);
burning.ailments.push({ type: 'ignite', time: 2, power: 1, sourceHitDamage: 100 });
assert.strictEqual(context.getSkillConditionalDamageMultiplier(flame, clean), 1, 'Flame Slash must not gain its multiplier on a clean target');
assert.strictEqual(context.getSkillConditionalDamageMultiplier(flame, burning), 1.15, 'Flame Slash must gain 15% hit damage against an ignited target');
const ailmentStats = context.getSkillAilmentStats({ igniteChance: 5, poisonChance: 7, sSkill: flame }, 'fire');
assert.strictEqual(ailmentStats.igniteChance, 30, 'Flame Slash must add its ignite chance without changing unrelated poison chance');
assert.strictEqual(ailmentStats.poisonChance, 7, 'Flame Slash must preserve unrelated ailment stats');

const poisonSkill = skills['독창 투척'];
const poisoned = enemy(1); const spreadTarget = enemy(2); const unrelated = enemy(3);
poisoned.ailments.push({ type: 'poison', time: 2.5, power: 0.9, stacks: 1, sourceHitDamage: 80, ailmentDotScore: 80 });
game.enemies = [poisoned, spreadTarget, unrelated];
withRandom(0, () => context.spreadSkillAilmentOnHit(poisoned, poisonSkill));
assert(spreadTarget.ailments.some(row => row.type === 'poison'), 'Poison Spear must spread poison to another living enemy on a successful roll');
assert.strictEqual(unrelated.ailments.length, 0, 'Poison Spear must not exceed its configured spread target count');
spreadTarget.ailments = [];
withRandom(0.99, () => context.spreadSkillAilmentOnHit(poisoned, poisonSkill));
assert.strictEqual(spreadTarget.ailments.length, 0, 'Poison Spear must not spread when its chance roll fails');
game.enemies = [poisoned];
withRandom(0, () => context.spreadSkillAilmentOnHit(poisoned, poisonSkill));
assert.strictEqual(poisoned.ailments.length, 1, 'Poison Spear must not mutate the source when no spread target exists');

const rupture = skills['암흑 파열'];
const before = enemy(1); before.hp = 151;
const after = enemy(2); after.hp = 149;
const beforeMul = context.getSkillConditionalDamageMultiplier(rupture, before);
const afterMul = context.getSkillConditionalDamageMultiplier(rupture, after);
assert(afterMul > beforeMul, 'Dark Rupture damage must rise continuously across the execute boundary');
assert(before.hp / before.maxHp >= rupture.executeThreshold && after.hp / after.maxHp < rupture.executeThreshold, 'execute fixtures must straddle the configured 15% threshold');

const barrage = skills['연발 사격'];
const baseTotal = barrage.multiHit;
const twoExtraTotal = baseTotal + 2 * barrage.extraProjectileDamagePct / 100;
assert.strictEqual(baseTotal, 4, 'Barrage must perform four real base hits');
assert.strictEqual(twoExtraTotal, 4.9, 'two extra projectiles must add reduced hits instead of doubling every base hit');
assert(twoExtraTotal < baseTotal * 2, 'extra projectiles must not multiply Barrage total damage abnormally');

const storm = skills['뇌운 낙뢰'];
const stormTarget = enemy(1);
game.enemies = [stormTarget];
withRandom(0, () => context.applySkillPeriodicOnHit(stormTarget, storm, 100));
for (let index = 0; index < storm.periodicOnHit.hits; index++) context.tickEnemySkillPeriodicEffects({}, storm.periodicOnHit.interval);
assert.strictEqual(stormTarget.hp, 1000 - storm.periodicOnHit.hits * 22, 'Thundercloud must deal exactly four configured periodic hits');
assert.strictEqual(stormTarget.skillPeriodic, null, 'Thundercloud must clear after its final repeat');
context.tickEnemySkillPeriodicEffects({}, 10);
assert.strictEqual(stormTarget.hp, 912, 'Thundercloud must not leave residual hits after completion');

const erosion = skills['빙결 침식'];
const coldTarget = enemy(1);
game.activeSkill = '빙결 침식';
for (let index = 0; index < 8; index++) context.applyEnemyDotFromHit(coldTarget, 100, { sSkill: erosion });
assert.strictEqual(coldTarget.dotStacks, erosion.dotStackCap, 'Frozen Erosion must stop at its five-stack cap');
assert.strictEqual(coldTarget.skillSlowPct, erosion.dotStackCap * erosion.dotStackSlowPct, 'Frozen Erosion slow must accumulate with its capped stacks');

const contagion = skills['심연 전염'];
assert.strictEqual(contagion.dotMultiplier, 1.3, 'Abyss Contagion must use the nerfed 30% increased DoT multiplier');
const dying = enemy(1, 0); const recipient = enemy(2);
dying.dotState = { skillName: '심연 전염', timeLeft: 2.5, rawTickDamage: 40, stacks: 3, tickTimer: 0.5, tickInterval: 1, ele: 'chaos' };
game.enemies = [dying, recipient];
context.transferSkillDotOnDeath(dying);
assert(recipient.dotState && recipient.dotState.timeLeft === 2.5, 'Abyss Contagion must transfer remaining duration on death');
assert.strictEqual(recipient.dotState.rawTickDamage, 40, 'Abyss Contagion must transfer the configured remaining damage');
assert.strictEqual(dying.marker, 1, 'dot transfer must not mutate unrelated source fields');
game.enemies = [dying];
dying.dotState = { ...dying.dotState, skillName: '심연 전염' };
context.transferSkillDotOnDeath(dying);
assert.strictEqual(game.enemies.length, 1, 'Abyss Contagion must safely do nothing without another living enemy');

function scaledDamage(skill, level) { return skill.baseDmg + (level - 1) * skill.dmgScale; }
function targetWeight(skill, count) {
  const capped = Math.min(count, skill.targetMode === 'all' ? Math.min(8, Math.max(6, skill.targets || 6)) : skill.targets || 1);
  if (skill.targetMode === 'cleave') return Array.from({ length: capped }, (_, i) => i === 0 ? 1 : 0.72).reduce((a, b) => a + b, 0);
  if (skill.targetMode === 'chain') return Array.from({ length: capped }, (_, i) => Math.max(0.45, 1 - i * 0.2)).reduce((a, b) => a + b, 0);
  if (skill.targetMode === 'pierce') return Array.from({ length: capped }, (_, i) => i === 0 ? 1 : 0.65).reduce((a, b) => a + b, 0);
  return capped;
}
function expected(skill, level, count) { return scaledDamage(skill, level) * targetWeight(skill, count) * (skill.multiHit || 1); }
for (const level of [1, 20]) {
  assert(expected(skills['화염 참격'], level, 3) < expected(skills['용암 강타'], level, 3), 'Magma Strike must retain stronger immediate three-target damage');
  assert(expected(skills['독창 투척'], level, 3) < expected(skills['독니 사출'], level, 3), 'Venom Fang must retain stronger immediate three-target projectile damage');
  assert(expected(skills['암흑 파열'], level, 3) < expected(skills['중력 붕괴'], level, 3), 'Gravity Collapse must retain stronger general three-target efficiency');
  assert(expected(skills['뇌운 낙뢰'], level, 3) < expected(skills['천뢰 분기'], level, 3), 'Heavenly Lightning Branch must retain stronger immediate chain damage');
}
console.log('skill role rework behavior checks passed');
