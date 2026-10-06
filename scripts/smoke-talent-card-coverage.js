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
context.P_STATS = {};
// 2026-10-06: the talent UI colours its effect lines (js/stat-tone-text-ui.js on the item tone table from js/ui.js).
context.getItemStatToneColor = id => `#tone-${id}`;
context.game = {
  talentCards: {},
  talentCardLoadout: [null, null, null, null, null, null],
  enemies: [],
  playerHp: 100,
};
vm.createContext(context);
require('./lib/load-combat-clock')(context);
['data/constants.js', 'js/utils.js', 'data/passives.js', 'data/ascendancies.js', 'data/talent-cards.js', 'js/talent-cards.js', 'js/stat-tone-text-ui.js', 'js/talent-ui.js'].forEach(file => {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
});
vm.runInContext('game = window.game;', context);

const defs = vm.runInContext('TALENT_BLOOM_CARD_DEFS', context);
const rules = vm.runInContext('TALENT_PRECISE_CARD_RULES', context);
const cardIds = Object.keys(defs);
assert.deepStrictEqual(Object.keys(rules), cardIds, '카드 정의마다 같은 순서의 정밀 규칙을 가져야 한다');
// 2026-10-02 재능 정리: 얻을 수 있는 카드는 전직마다 한 장(직업의 대표 재능 × 전직) 18장이다.
const bloomKeys = vm.runInContext('getTalentBloomCardKeys()', context);
assert.strictEqual(bloomKeys.length, 18, '개화 카드는 전직마다 한 장, 18장이어야 한다');
assert.strictEqual(vm.runInContext('TALENT_BLOOM_TOTAL_CARDS', context), 18);
bloomKeys.forEach(key => assert.ok(defs[key] && rules[key], `${key}: 카드 정의와 규칙이 있어야 한다`));

const heroDefs = vm.runInContext('HERO_SELECTION_DEFS', context);
context.getHeroSelectionDef = heroId => heroDefs[heroId];
context.game.ascendClass = 'warrior';
context.game.talentCards = {
  hero2__warrior: { level: 3, score: 20, count: 1 },
  hero2__berserker: { level: 2, score: 10, count: 1 },
};
const classRows = JSON.parse(vm.runInContext('JSON.stringify(getTalentCardClassRows(game.talentCards))', context));
assert.deepStrictEqual(classRows.map(row => [row.id, row.count, row.total]),
  [['warrior', 2, 3], ['wanderer', 0, 3], ['archer', 0, 3], ['cleric', 0, 3], ['occultist', 0, 3], ['alchemist', 0, 3]],
  '직업별 현황은 직업마다 전직 카드 셋 중 모은 수를 보여야 한다');
const slotHtml = vm.runInContext("renderTalentLoadoutSlot(0, true, 'hero2__warrior', game.talentCards)", context);
assert(slotHtml.includes('땅울림') && slotHtml.includes('전사 × 워리어'),
  '장착 슬롯은 카드 이름과 재능, 전직을 함께 표시해야 한다');

const slotsAt = count => {
  context.game.talentCards = Object.fromEntries(Array.from({ length: count }, (_, index) => [`owned-${index}`, { level: 1 }]));
  return context.getUnlockedTalentSlotCount();
};
assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6, 8, 9, 11, 12, 18].map(slotsAt), [0, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6],
  '장착 칸은 카드 1, 2, 4, 6, 9, 12장에서 하나씩 열린다(18장 기준)');

const declaredStats = new Set();
const declaredUniqueKeys = new Set();
cardIds.forEach(cardId => {
  const def = defs[cardId];
  const rule = rules[cardId];
  const hidden = Array.isArray(def.hidden) ? def.hidden : [def.hidden];
  const ruleStats = Object.entries(rule.stats || {});
  const ruleUniques = Array.isArray(rule.uniques) ? rule.uniques : [];
  const [heroId, classKey] = cardId.split('__');

  assert.ok(def.surface && def.surface.desc, `${cardId}: 표면 기획 설명이 필요하다`);
  assert.ok(rule && typeof rule.mechanic === 'string' && rule.mechanic.length > 0, `${cardId}: 정밀 메커니즘 식별자가 필요하다`);
  assert.ok(hidden.length > 0 && hidden.every(row => row && row.stat), `${cardId}: 이면 효과가 비어 있다`);

  const rendered = context.getTalentCardEffectLines(heroId, classKey, 10).join(' ');
  assert.ok(rendered.includes(def.surface.desc), `${cardId}: 기획 원문을 숨기면 안 된다`);
  assert.ok(!rendered.includes('undefined') && !rendered.includes('NaN'), `${cardId}: 표시 수치가 유효해야 한다`);

  const bonuses = context.getTalentCardStatBonuses(heroId, classKey, 10);
  assert.strictEqual(bonuses.length, hidden.length + ruleStats.length,
    `${cardId}: 이면 또는 정밀 표면 스탯이 합산에서 누락됐다`);
  bonuses.forEach(row => {
    assert.ok(Number.isFinite(row.val) && row.val !== 0, `${cardId}/${row.stat}: 유효한 비영(非零) 수치여야 한다`);
    declaredStats.add(row.stat);
  });

  const uniqueEffects = context.getTalentCardUniqEffects(heroId, classKey, 10);
  assert.strictEqual(uniqueEffects.length, ruleUniques.length, `${cardId}: 정밀 고유 효과가 유실됐다`);
  uniqueEffects.forEach(effect => {
    assert.strictEqual(effect.cardId, cardId, `${cardId}: 고유 효과 카드 식별자가 유실됐다`);
    assert.strictEqual(effect.talentCardId, cardId, `${cardId}: 전투 카드 식별자가 유실됐다`);
    declaredUniqueKeys.add(effect.key);
  });

  context.game.talentCards = { [cardId]: { level: 10, score: 600, count: 1 } };
  context.game.talentCardLoadout = [cardId, null, null, null, null, null];
  assert.strictEqual(context.getActiveTalentCardStatBonuses().length, bonuses.length,
    `${cardId}: 장착 슬롯에서 스탯 효과가 유실됐다`);
  assert.strictEqual(context.getActiveTalentKeystoneUniqueEffects().length, ruleUniques.length,
    `${cardId}: 장착 슬롯에서 고유 효과가 유실됐다`);
});

const uniqueLabels = vm.runInContext('Object.keys(TALENT_UNIQ_LABELS)', context);
declaredUniqueKeys.forEach(key => assert.ok(uniqueLabels.includes(key), `${key}: 카드 효과 문구가 있어야 한다(없으면 키 이름이 그대로 보인다)`));

declaredStats.forEach(stat => {
  const bucket = context.createEmptyStatBucket();
  const before = JSON.stringify(bucket);
  context.addStatToBucket(bucket, stat, 1);
  assert.notStrictEqual(JSON.stringify(bucket), before, `${stat}: 스탯 버킷이 정밀 재능 수치를 소비하지 않는다`);
  Object.values(bucket).forEach(value => assert.ok(Number.isFinite(value), `${stat}: 스탯 합산 결과가 유한수여야 한다`));
});

// 2026-10-02 재능 정리: 정의는 얻을 수 있는 18장과 효과를 키스톤이나 고유 주얼로 옮긴 20장(smoke-ascendancy-classes)뿐이다.
assert.strictEqual(cardIds.length, 38, '정의는 18장과 효과를 옮긴 20장이어야 한다');

context.game.talentCards = { hero2__warrior: { level: 3, score: 20, count: 1 } };
context.game.ascendClass = 'berserker';
const combinationHtml = context.renderTalentCombinationStatus(context.game.talentCards);
assert(combinationHtml.includes("showTalentCombinationTooltip(event,'hero2__warrior')") && combinationHtml.includes('대지 분쇄자'),
  '직업 카드 현황은 지금 전직의 직업 카드 셋을 보이고, 개화한 카드는 효과 툴팁을 준다');
let talentTooltip = null;
context.showInfoTooltipHtml = (x, y, html) => { talentTooltip = { x, y, html }; };
context.showTalentCombinationTooltip({ clientX: 12, clientY: 34 }, 'hero2__warrior');
assert(talentTooltip && talentTooltip.html.includes('땅울림') && talentTooltip.html.includes('[표면]'),
  '개화 현황 툴팁은 카드 이름과 원문 효과를 보여야 한다');

console.log(`smoke-talent-card-coverage passed (${cardIds.length} cards, ${declaredStats.size} stats, ${declaredUniqueKeys.size} unique effects)`);
