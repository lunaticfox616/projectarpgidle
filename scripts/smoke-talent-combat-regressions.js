#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const src = fs.readFileSync('js/combat.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

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
  game: {
    selectedHeroId: 'hero1', ascendClass: 'gladiator', enemies: [{ id: 42, hp: 100 }, { id: 7, hp: 0 }]
  }
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext([
  fn('getAliveEnemyByRuntimeKey'),
  fn('getActiveTalentCardId'),
  fn('isTalentCardActive'),
  fn('getActiveTalentUniqueEffects'),
  fn('prepareTalentPlayerAttackContext'),
  fn('getTalentAttackDamageMul'),
  fn('getTalentKeystoneDamageMul'),
  fn('getTalentPlayerHitDamageMultiplier'),
  fn('getTalentPlayerAttackDamageMultiplier'),
  fn('isDeferredTalentProjectileTargetEffect'),
  fn('updateTalentButcherHitMark'),
  fn('canApplyTalentExecuteThreshold'),
  'this.getAliveEnemyByRuntimeKey = getAliveEnemyByRuntimeKey;',
  'this.getActiveTalentCardId = getActiveTalentCardId;',
  'this.isTalentCardActive = isTalentCardActive;',
  'this.getActiveTalentUniqueEffects = getActiveTalentUniqueEffects;',
  'this.prepareTalentPlayerAttackContext = prepareTalentPlayerAttackContext;',
  'this.getTalentAttackDamageMul = getTalentAttackDamageMul;',
  'this.getTalentKeystoneDamageMul = getTalentKeystoneDamageMul;',
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

assert.strictEqual(ctx.getActiveTalentCardId(), 'hero1__gladiator', 'active talent card must derive from the selected hero and ascend class');
assert.strictEqual(ctx.isTalentCardActive('hero1__gladiator'), true, 'Fletcher must be active in production talent runtime');
assert.deepEqual(ctx.getActiveTalentUniqueEffects(), [{ key: 'projectileTargetBonus', params: { target: 3 }, talentCardId: 'hero1__gladiator' }], 'Fletcher must feed a tagged projectile target effect into the production effect stream');

const projectileStats = { sSkill: { tags: ['projectile'], targets: 1 } };
ctx.prepareTalentPlayerAttackContext(projectileStats);
assert.strictEqual(projectileStats.sSkill.targets, 1, 'Fletcher must not add targets on attack 1');
assert.strictEqual(ctx.getTalentPlayerAttackDamageMultiplier(), 1, 'Fletcher must not add damage on attack 1');
ctx.prepareTalentPlayerAttackContext(projectileStats);
assert.strictEqual(projectileStats.sSkill.targets, 1, 'Fletcher must not add targets on attack 2');
ctx.prepareTalentPlayerAttackContext(projectileStats);
assert.strictEqual(projectileStats.sSkill.targets, 4, 'Fletcher must add +3 targets on attack 3 only');
assert.strictEqual(ctx.getTalentPlayerAttackDamageMultiplier(), 1.33, 'Fletcher must add damage on the same third player attack');
assert.strictEqual(ctx.getTalentPlayerHitDamageMultiplier({ isBoss: true }, 'fire', true, projectileStats), 1, 'neutral keystone provider must be wired and callable without test fakes');

assert.strictEqual(ctx.isDeferredTalentProjectileTargetEffect({ key: 'projectileTargetBonus', talentCardId: 'hero1__gladiator' }), true, 'Fletcher target bonuses must be deferred out of persistent target stats');
assert.strictEqual(ctx.isDeferredTalentProjectileTargetEffect({ key: 'projectileTargetBonus', itemName: '명사수의 경보' }), false, 'item projectile target bonuses must remain persistent');
assert(src.includes('getActiveTalentUniqueEffects().forEach(effect => equippedUniqueEffects.push(effect));'), 'production player stats must feed tagged talent effects into the effect stream');
assert(src.includes('prepareTalentPlayerAttackContext(pStats);'), 'player attacks must prepare the talent context before target selection');
assert(html.includes('js/combat.js'), 'combat runtime must be loaded by index.html');

ctx.game.selectedHeroId = 'hero2';
ctx.game.ascendClass = 'assassin';
ctx.game.talentButcherMarks = {};
const butcherTarget = { id: 42, hp: 100, isBoss: false };
assert.strictEqual(ctx.isTalentCardActive('hero2__assassin'), true, 'Butcher must be active in production talent runtime');
assert.strictEqual(ctx.canApplyTalentExecuteThreshold(butcherTarget, 0.30), false, 'Butcher execute must wait for its four-hit mark');
for (let i = 0; i < 4; i++) ctx.updateTalentButcherHitMark(butcherTarget);
assert.strictEqual(ctx.canApplyTalentExecuteThreshold(butcherTarget, 0.30), true, 'Butcher execute must unlock after four hits on the same enemy');
assert(src.includes('let enemy = getAliveEnemyByRuntimeKey(enemyId);'), 'curse expiry lookup must use numeric-aware runtime enemy lookup');

console.log('talent combat regression smoke checks passed');
