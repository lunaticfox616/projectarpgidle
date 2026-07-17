const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
  console,
  window: null,
  globalThis: null,
  document: { getElementById() { return null; } },
  Math,
  Number,
  String,
  Object,
  Array,
  Map,
  Set,
  JSON,
};
context.window = context;
context.globalThis = context;
context.game = {
  talentCards: {},
  talentCardLoadout: [null, null, null, null, null, null],
  enemies: [],
  playerHp: 100,
};
vm.createContext(context);
['data/talent-cards.js', 'js/utils.js', 'js/talent-cards.js'].forEach(file => {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
});
vm.runInContext('game = window.game;', context);

const defs = vm.runInContext('TALENT_BLOOM_CARD_DEFS', context);
const cardIds = Object.keys(defs);
assert.strictEqual(cardIds.length, 120, '재능 카드 정의는 120종이어야 한다');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const talentSource = fs.readFileSync('js/talent-cards.js', 'utf8');
const preciseRuntimeOnly = new Set([
  'hero1__inquisitor',
  'hero2__gladiator',
  'hero2__hunter',
]);
const supportedConditions = new Set(['always', 'lowLife', 'highLife', 'vsBoss', 'onCrit', 'fewEnemies', 'manyEnemies', 'moving']);
const declaredStats = new Set();
const declaredUniqueKeys = new Set();

cardIds.forEach(cardId => {
  const def = defs[cardId];
  const surface = def.surface || {};
  const hidden = Array.isArray(def.hidden) ? def.hidden : (def.hidden ? [def.hidden] : []);
  const ops = Array.isArray(surface.ops) ? surface.ops : [];
  const uniques = Array.isArray(surface.uniq) ? surface.uniq : [];
  const hasSurfaceRoute = ops.length > 0 || uniques.length > 0 || !!surface.dmg || preciseRuntimeOnly.has(cardId);

  assert.ok(surface.desc, `${cardId}: 표면 설명이 필요하다`);
  assert.ok(hasSurfaceRoute, `${cardId}: 표면 효과가 실제 적용 경로를 갖지 않는다`);
  assert.ok(hidden.length > 0, `${cardId}: 이면 효과가 비어 있다`);

  const [heroId, classKey] = cardId.split('__');
  const bonuses = context.getTalentCardStatBonuses(heroId, classKey, 10);
  assert.strictEqual(bonuses.length, hidden.length + ops.length, `${cardId}: 선언된 스탯 일부가 합산에서 누락됐다`);
  bonuses.forEach(row => {
    assert.ok(Number.isFinite(row.val), `${cardId}/${row.stat}: 적용 수치가 유한수가 아니다`);
    assert.notStrictEqual(row.val, 0, `${cardId}/${row.stat}: 적용 수치가 0이다`);
    declaredStats.add(row.stat);
  });

  const uniqueEffects = context.getTalentCardUniqEffects(heroId, classKey, 10);
  assert.strictEqual(uniqueEffects.length, uniques.length, `${cardId}: 선언된 고유 효과 일부가 변환에서 누락됐다`);
  uniqueEffects.forEach(effect => {
    assert.strictEqual(effect.cardId, cardId, `${cardId}: 조건부 판정에 필요한 카드 식별자가 유실됐다`);
    assert.strictEqual(effect.talentCardId, cardId, `${cardId}: 전투용 카드 식별자가 유실됐다`);
    declaredUniqueKeys.add(effect.key);
  });

  context.game.talentCards = { [cardId]: { level: 10, score: 600, count: 1 } };
  context.game.talentCardLoadout = [cardId, null, null, null, null, null];
  const activeBonuses = context.getActiveTalentCardStatBonuses();
  assert.strictEqual(activeBonuses.length, bonuses.length, `${cardId}: 장착 슬롯에서 스탯 효과가 유실됐다`);
  const activeBucket = context.createEmptyStatBucket();
  context.applyStatsToBucket(activeBucket, activeBonuses);
  Object.entries(activeBucket).forEach(([key, value]) => {
    assert.ok(Number.isFinite(value), `${cardId}: 실제 장착 합산 ${key}가 유한수가 아니다`);
  });
  const activeUniqueEffects = context.getActiveTalentKeystoneUniqueEffects();
  assert.strictEqual(activeUniqueEffects.length, uniques.length, `${cardId}: 장착 슬롯에서 고유 효과가 유실됐다`);

  if (surface.dmg) {
    assert.ok(supportedConditions.has(surface.dmg.when || 'always'), `${cardId}: 지원하지 않는 피해 조건 ${surface.dmg.when}`);
    const damage = context.getTalentCardKeystoneDamage(heroId, classKey, 10);
    assert.ok(damage && Number.isFinite(damage.moreMul) && damage.moreMul !== 0, `${cardId}: 조건부 피해가 변환되지 않는다`);
    const threshold = Math.max(1, Number(surface.dmg.threshold) || 1);
    context.game.enemies = Array.from({ length: surface.dmg.when === 'manyEnemies' ? threshold : 1 }, (_, index) => ({ id: index + 1, hp: 100 }));
    context.game.playerHp = 100;
    const target = { hp: 100, maxHp: 100, isBoss: surface.dmg.when === 'vsBoss' };
    const appliedMul = context.getTalentKeystoneDamageMul(target, 'phys', surface.dmg.when === 'onCrit', { maxHp: 100 });
    assert.ok(Number.isFinite(appliedMul) && appliedMul > 1, `${cardId}: 장착된 조건부 피해가 실제 판정에서 적용되지 않는다`);
  }

  if (preciseRuntimeOnly.has(cardId)) {
    assert.ok(combatSource.includes(cardId) || talentSource.includes(cardId), `${cardId}: 정밀 런타임 효과가 연결되지 않았다`);
  }
});

declaredStats.forEach(stat => {
  const bucket = context.createEmptyStatBucket();
  const before = JSON.stringify(bucket);
  context.addStatToBucket(bucket, stat, 1);
  assert.notStrictEqual(JSON.stringify(bucket), before, `${stat}: 스탯 버킷이 재능 수치를 소비하지 않는다`);
  Object.entries(bucket).forEach(([key, value]) => {
    assert.ok(Number.isFinite(value), `${stat}: ${key} 합산 결과가 유한수가 아니다`);
  });
});

declaredUniqueKeys.forEach(key => {
  const single = `effect.key === '${key}'`;
  assert.ok(combatSource.includes(single), `${key}: 고유 효과가 전투 엔진에서 소비되지 않는다`);
});

context.game.talentCards = { hero1__gladiator: { level: 10, score: 600, count: 1 } };
context.game.talentCardLoadout = ['hero1__gladiator', null, null, null, null, null];
const fletcherEffects = context.getActiveTalentKeystoneUniqueEffects();
assert.strictEqual(fletcherEffects.length, 1, '플레쳐 고유 효과는 한 경로로만 주입되어야 한다');
assert.strictEqual(fletcherEffects[0].talentCardId, 'hero1__gladiator', '플레쳐 조건부 대상 보너스 식별자가 필요하다');
assert.ok(combatSource.includes("effect.cardId === 'hero1__gladiator'"), '플레쳐 대상 보너스는 상시 적용에서 제외되어야 한다');

console.log(`smoke-talent-card-coverage passed (${cardIds.length} cards, ${declaredStats.size} stats, ${declaredUniqueKeys.size} unique effects)`);
