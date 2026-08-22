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
const rules = vm.runInContext('TALENT_PRECISE_CARD_RULES', context);
const cardIds = Object.keys(defs);
assert.strictEqual(cardIds.length, 120, '재능 카드 정의는 120종이어야 한다');
assert.deepStrictEqual(Object.keys(rules), cardIds, '120개 카드 모두 같은 순서의 정밀 규칙을 가져야 한다');

context.HERO_SELECTION_ORDER = ['hero1', 'hero2'];
context.HERO_SELECTION_DEFS = { hero1: {}, hero2: {} };
context.CLASS_TEMPLATES = { warrior: { name: '전사' }, ranger: { name: '레인저' } };
context.getHeroSelectionDef = heroId => ({ label: heroId === 'hero1' ? '궁수' : '전사 재능' });
context.game.selectedHeroId = 'hero1';
context.game.ascendClass = 'warrior';
context.game.talentCards = {
  hero1__warrior: { level: 3, score: 20, count: 1 },
  hero2__warrior: { level: 2, score: 10, count: 1 },
};
context.setTalentCardView('talent');
let dimensionRows = JSON.parse(vm.runInContext('JSON.stringify(getTalentCardDimensionRows(game.talentCards))', context));
assert.deepStrictEqual(dimensionRows.map(row => [row.id, row.count]), [['hero1', 1], ['hero2', 1]],
  '재능별 현황은 각 재능의 개화 조합 수를 보여야 한다');
context.setTalentCardView('class');
dimensionRows = JSON.parse(vm.runInContext('JSON.stringify(getTalentCardDimensionRows(game.talentCards))', context));
assert.deepStrictEqual(dimensionRows.map(row => [row.id, row.count]), [['warrior', 2], ['ranger', 0]],
  '직업별 현황은 미개화 직업도 0건으로 함께 보여야 한다');
const slotHtml = vm.runInContext("renderTalentLoadoutSlot(0, true, 'hero1__warrior', game.talentCards)", context);
assert(slotHtml.includes('아방가르드') && slotHtml.includes('궁수 × 전사'),
  '장착 슬롯은 혼합 재능명과 원본 재능·직업을 함께 표시해야 한다');

context.game.talentCards = Object.fromEntries(Array.from({ length: 39 }, (_, index) => [`owned-${index}`, { level: 1 }]));
assert.strictEqual(context.getUnlockedTalentSlotCount(), 4, '개화 카드 39장까지는 장착 슬롯 4칸이어야 한다');
context.game.talentCards['owned-39'] = { level: 1 };
assert.strictEqual(context.getUnlockedTalentSlotCount(), 5, '개화 카드 40장에서 5번째 슬롯이 열려야 한다');
for (let index = 40; index < 59; index += 1) context.game.talentCards[`owned-${index}`] = { level: 1 };
assert.strictEqual(context.getUnlockedTalentSlotCount(), 5, '개화 카드 59장까지는 장착 슬롯 5칸이어야 한다');
context.game.talentCards['owned-59'] = { level: 1 };
assert.strictEqual(context.getUnlockedTalentSlotCount(), 6, '개화 카드 60장에서 6번째 슬롯이 열려야 한다');

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

declaredStats.forEach(stat => {
  const bucket = context.createEmptyStatBucket();
  const before = JSON.stringify(bucket);
  context.addStatToBucket(bucket, stat, 1);
  assert.notStrictEqual(JSON.stringify(bucket), before, `${stat}: 스탯 버킷이 정밀 재능 수치를 소비하지 않는다`);
  Object.values(bucket).forEach(value => assert.ok(Number.isFinite(value), `${stat}: 스탯 합산 결과가 유한수여야 한다`));
});

assert.strictEqual(context.getTalentCardUniqEffects('hero1', 'warrior', 10).length, 0,
  '아방가르드 관통은 전용 경로만 사용하고 범용 초과 피해 효과와 중복되면 안 된다');
const raven = context.getTalentCardUniqEffects('hero6', 'assassin', 10)[0];
assert.strictEqual(raven.params.ds, 0, '레이븐은 타겟 수만 늘리고 연속타격을 부여하면 안 된다');
const heavy = context.getTalentCardUniqEffects('hero10', 'gladiator', 10)[0];
assert.strictEqual(heavy.params.ds, 0, '헤비플라스크는 타겟 수만 늘리고 연속타격을 부여하면 안 된다');
assert.strictEqual(context.getTalentCardStatBonuses('hero7', 'inquisitor', 10)
  .find(row => row.stat === 'suppCap').val, 1, '파문심문관은 보조 젬 한도 +1을 실제 스탯으로 줘야 한다');
assert.strictEqual(context.getTalentCardStatBonuses('hero10', 'warrior', 10)
  .find(row => row.stat === 'physIgnore').val, 8, '강철술사는 물리 피해 감소 무시 +8%를 줘야 한다');

context.game.talentCards = { hero1__warrior: { level: 3, score: 20, count: 1 } };
context.setTalentCardView('talent');
const combinationHtml = context.renderTalentCombinationStatus(context.game.talentCards);
assert(combinationHtml.includes("showTalentCombinationTooltip(event,'hero1__warrior')"),
  '개화 완료 조합은 커스텀 효과 툴팁 호버를 제공해야 한다');
let talentTooltip = null;
context.showInfoTooltipHtml = (x, y, html) => { talentTooltip = { x, y, html }; };
context.showTalentCombinationTooltip({ clientX: 12, clientY: 34 }, 'hero1__warrior');
assert(talentTooltip && talentTooltip.html.includes('아방가르드') && talentTooltip.html.includes('[표면]'),
  '개화 현황 툴팁은 조합명과 원문 효과를 보여야 한다');

console.log(`smoke-talent-card-coverage passed (${cardIds.length} cards, ${declaredStats.size} stats, ${declaredUniqueKeys.size} unique effects)`);
