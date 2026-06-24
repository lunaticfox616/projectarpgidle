#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const itemDataSource = fs.readFileSync('data/items.js', 'utf8');
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
const itemsSource = fs.readFileSync('js/items.js', 'utf8');

function extractFunction(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert(match, `${name} must exist`);
  return match[0];
}

const dataSandbox = { window: {} };
vm.createContext(dataSandbox);
vm.runInContext(itemDataSource, dataSandbox);
const uniqueDb = dataSandbox.window.UNIQUE_DB;
const fateTwin = uniqueDb.find(unique => unique.name === '운명의 쌍현');
assert(fateTwin, 'Fate Twin unique must exist');
assert.strictEqual(fateTwin.dropOnly && fateTwin.dropOnly.type, 'cosmos', 'Fate Twin must remain cosmos-only');
assert.strictEqual(fateTwin.reqTier, 14, 'Fate Twin tier must be reachable in cosmos tier 14+ drops');

const dropSandbox = {
  UNIQUE_DB: uniqueDb,
  EQUIPMENT_DROP_SLOTS: ['목걸이'],
  BASE_ITEM_DB: [{ id: 'test_neck', slot: '목걸이', name: '테스트 목걸이', reqTier: 14, baseStats: [] }],
  UNIQUE_FIXED_BASE_BY_NAME: {},
  game: { currentZoneId: 'cosmos_challenge' },
  itemIdCounter: 0,
  Math: Object.create(Math),
  getZone() { return { id: 'cosmos_challenge', type: 'cosmos', tier: 14 }; },
  rndChoice(list) { return list.find(row => row && row.name === '운명의 쌍현') || list[0]; },
  chooseItemBase() { return { id: 'test_neck', slot: '목걸이', name: '테스트 목걸이', reqTier: 14, baseStats: [] }; },
  rollBaseStats() { return []; },
  rollUniqueStatValue(stat) { return { val: stat.min, min: stat.min, max: stat.max }; },
  getStatName(id) { return id; }
};
dropSandbox.Math.random = () => 0.9;
vm.createContext(dropSandbox);
vm.runInContext(`${extractFunction(passivesSource, 'generateUniqueItem')}; this.generateUniqueItem = generateUniqueItem;`, dropSandbox);
const cosmosDrop = dropSandbox.generateUniqueItem(14, '목걸이');
assert.strictEqual(cosmosDrop.name, '운명의 쌍현', 'Fate Twin must be selectable from cosmos unique drops');
assert.strictEqual(cosmosDrop.uniqueEffectKey, 'fateTwinRollSync', 'Fate Twin drop must carry its unique effect');

assert(passivesSource.includes('Math.random() < 0.0016'), 'field chase unique chance must be 0.16%');
assert(itemsSource.includes('const BLACK_MARKET_CHASE_UNIQUE_CHANCE = 0.0016;'), 'black market chase unique pick chance must match 0.16%');
assert(itemsSource.includes('if (!unique.dropOnly) return true;') && itemsSource.includes('return false;'), 'realm/drop-only uniques must not be black market eligible');
assert(itemsSource.includes('function isBaseEligibleForBlackMarket(base)'), 'black market base eligibility helper must exist');
assert(itemsSource.includes('price = rollBlackMarketChaseUniquePrice(req);'), 'chase unique market prices must use the divine-price roller');
assert(itemsSource.includes('offer.chase ? \'체이싱\' : \'고유\''), 'chase uniques must render with a distinct black-market badge');
assert(itemsSource.includes('✨ 고유 효과: ${escapeHTML(effect)}'), 'black market unique tooltip must include unique effect text');
assert(itemsSource.includes('고유 옵션 · ${escapeHTML(label)}'), 'black market unique tooltip must label unique stat options');

const marketSandbox = {
  Math: Object.create(Math),
  UNIQUE_DB: uniqueDb,
  ORB_DB: dataSandbox.window.ORB_DB,
  SKILL_DB: {},
  BASE_ITEM_DB: [
    { id: 'common_weapon', slot: '무기', name: '일반 검', reqTier: 1, baseStats: [{ id: 'flatDmg', base: 10 }] },
    { id: 'cosmos_weapon', slot: '무기', name: '우주계 검', reqTier: 1, realmBase: 'cosmos', baseStats: [{ id: 'flatDmg', base: 99 }] }
  ],
  UNIQUE_FIXED_BASE_BY_NAME: {},
  BLACK_MARKET_CHASE_UNIQUE_CHANCE: 0.0016,
  game: { currentZoneId: 0, blackMarket: {}, currencies: {}, maxZoneId: 20 },
  getZone() { return { tier: 20 }; },
  rndChoice(list) { return list.find(row => row && row.ultraRare) || list[0]; },
  isMarketUnlocked() { return true; },
  hasSkillGemOwned() { return true; },
  chooseItemBase() { return { slot: '무기', name: '테스트', reqTier: 1 }; }
};
{
  const values = [0.95, 0, 0];
  marketSandbox.Math.random = () => values.length ? values.shift() : 0;
}
vm.createContext(marketSandbox);
vm.runInContext([
  extractFunction(itemsSource, 'isUniqueEligibleForBlackMarket'),
  extractFunction(itemsSource, 'isBaseEligibleForBlackMarket'),
  extractFunction(itemsSource, 'getBlackMarketUniqueBase'),
  extractFunction(itemsSource, 'rollBlackMarketChaseUniquePrice'),
  extractFunction(itemsSource, 'buildBlackMarketOffer'),
  'this.isBaseEligibleForBlackMarket = isBaseEligibleForBlackMarket;',
  'this.buildBlackMarketOffer = buildBlackMarketOffer;'
].join('\n'), marketSandbox);
assert.strictEqual(marketSandbox.isBaseEligibleForBlackMarket({ name: '우주계 검', realmBase: 'cosmos' }), false, 'cosmos-exclusive bases must not be eligible for black market base offers');
const offer = marketSandbox.buildBlackMarketOffer(0);
assert.strictEqual(offer.type, 'unique', 'forced market roll should create a unique offer');
assert.strictEqual(offer.chase, true, 'black market can roll non-realm chase uniques');
assert.strictEqual(offer.priceKey, 'divine', 'chase unique market price must be divine orbs');
assert(offer.price >= 30 && offer.price <= 150, 'chase unique divine price must stay in the 30~150 range');
assert.notStrictEqual(offer.baseId, 'cosmos_weapon', 'black market unique offers must not preview cosmos-exclusive bases');

console.log('cosmos unique and black market chase smoke checks passed');
