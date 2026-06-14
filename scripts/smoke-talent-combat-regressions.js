#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const src = fs.readFileSync('js/combat.js', 'utf8');

function fn(name) {
  const start = src.indexOf('function ' + name + '(');
  assert(start >= 0, 'missing function ' + name);
  const bodyStart = src.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') depth--;
    if (depth === 0) return src.slice(start, i + 1);
  }
  assert.fail('unterminated function ' + name);
}

const ctx = {
  Math, Number,
  game: { enemies: [{ id: 42, hp: 100 }, { id: 7, hp: 0 }] },
  __attackCalls: 0,
  __activeCards: new Set(),
  getTalentAttackDamageMul: () => { ctx.__attackCalls += 1; return 1.25; },
  getTalentKeystoneDamageMul: (target, ele, crit, stats) => target && target.isBoss && ele === 'fire' && crit && stats ? 1.4 : 1.1,
  isTalentCardActive: id => ctx.__activeCards.has(id)
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext([
  fn('getAliveEnemyByRuntimeKey'),
  fn('getTalentPlayerHitDamageMultiplier'),
  fn('getTalentPlayerAttackDamageMultiplier'),
  fn('isDeferredTalentProjectileTargetEffect'),
  fn('updateTalentButcherHitMark'),
  fn('canApplyTalentExecuteThreshold'),
  'this.getAliveEnemyByRuntimeKey = getAliveEnemyByRuntimeKey;',
  'this.getTalentPlayerHitDamageMultiplier = getTalentPlayerHitDamageMultiplier;',
  'this.getTalentPlayerAttackDamageMultiplier = getTalentPlayerAttackDamageMultiplier;',
  'this.isDeferredTalentProjectileTargetEffect = isDeferredTalentProjectileTargetEffect;',
  'this.updateTalentButcherHitMark = updateTalentButcherHitMark;',
  'this.canApplyTalentExecuteThreshold = canApplyTalentExecuteThreshold;'
].join('\n'), ctx);

assert.strictEqual(ctx.getAliveEnemyByRuntimeKey('42'), ctx.game.enemies[0], 'runtime enemy lookups must accept string map keys for numeric enemy ids');
assert.strictEqual(ctx.getAliveEnemyByRuntimeKey(42), ctx.game.enemies[0], 'runtime enemy lookups must keep numeric ids working');
assert.strictEqual(ctx.getAliveEnemyByRuntimeKey('7'), null, 'dead enemies must not be returned for runtime effects');
assert.strictEqual(ctx.getAliveEnemyByRuntimeKey('not-an-id'), null, 'invalid runtime keys must not match enemies');

const attackMul = ctx.getTalentPlayerAttackDamageMultiplier();
assert.strictEqual(attackMul, 1.25, 'player attacks must sample the attack talent multiplier once per attack');
assert.strictEqual(ctx.__attackCalls, 1, 'attack talent multiplier must not be sampled once per target or by summon hits');
assert.strictEqual(attackMul * ctx.getTalentPlayerHitDamageMultiplier({ isBoss: false }, 'cold', false, {}), 1.25 * 1.1, 'player hits must include attack and keystone talent multipliers');
assert.strictEqual(attackMul * ctx.getTalentPlayerHitDamageMultiplier({ isBoss: true }, 'fire', true, {}), 1.25 * 1.4, 'target-aware keystone talent multipliers must affect player hits');
assert.strictEqual(ctx.isDeferredTalentProjectileTargetEffect({ key: 'projectileTargetBonus', talentCardId: 'hero1__gladiator' }), true, 'Fletcher target bonuses must be deferred out of persistent target stats');
assert.strictEqual(ctx.isDeferredTalentProjectileTargetEffect({ key: 'projectileTargetBonus', itemName: '명사수의 경보' }), false, 'item projectile target bonuses must remain persistent');
ctx.__activeCards.add('hero2__assassin');
const butcherTarget = { id: 42, hp: 100, isBoss: false };
assert.strictEqual(ctx.canApplyTalentExecuteThreshold(butcherTarget, 0.30), false, 'Butcher execute must wait for its four-hit mark');
for (let i = 0; i < 4; i++) ctx.updateTalentButcherHitMark(butcherTarget);
assert.strictEqual(ctx.canApplyTalentExecuteThreshold(butcherTarget, 0.30), true, 'Butcher execute must unlock after four hits on the same enemy');
assert(src.includes('let talentAttackMul = getTalentPlayerAttackDamageMultiplier();'), 'direct player attack path must sample the attack talent multiplier once');
assert(src.includes('let talentKeystoneMul = getTalentPlayerHitDamageMultiplier(targetEnemy, hitElement, hitCrit, pStats);'), 'direct player hit path must call the target-aware talent multiplier helper');
assert(src.includes('let enemy = getAliveEnemyByRuntimeKey(enemyId);'), 'curse expiry lookup must use numeric-aware runtime enemy lookup');

console.log('talent combat regression smoke checks passed');
