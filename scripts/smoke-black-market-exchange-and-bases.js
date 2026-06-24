#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/items.js', 'utf8');
assert(
  source.includes('const BLACK_MARKET_T20_RARE_BASE_CHANCE = 0.001;'),
  'black-market T20 rare base chance must stay below natural final-base drop weighting'
);

function extractFunctionBlock(text, name) {
  const start = text.indexOf(`function ${name}`);
  assert(start >= 0, `${name} must exist`);
  const bodyStart = text.indexOf('{', text.indexOf(')', start));
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = bodyStart; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error(`${name} body not found`);
}

function withRandomSequence(values, fn) {
  const sandboxMath = Object.create(Math);
  sandboxMath.random = () => {
    assert(values.length > 0, 'test random sequence exhausted');
    return values.shift();
  };
  return fn(sandboxMath);
}

function createSandbox(mathObject) {
  return {
    Math: mathObject,
    BASE_ITEM_DB: [
      { id: 'rusted_sword', slot: '무기', name: '녹슨 검', reqTier: 1, chainGroup: 'sword', baseStats: [{ id: 'flatDmg', base: 8, baseMax: 10 }] },
      { id: 'apex_sword', slot: '무기', name: '정점의 검', reqTier: 20, chainGroup: 'sword', baseStats: [{ id: 'flatDmg', base: 60, baseMax: 70 }] },
      { id: 'realm_sword', slot: '무기', name: '계 전용 검', reqTier: 20, realmBase: 'cosmos', baseStats: [{ id: 'flatDmg', base: 999 }] }
    ],
    UNIQUE_DB: [],
    ORB_DB: { chaos: { name: '카오스 오브' }, alchemy: { name: '연금술의 오브' } },
    SKILL_DB: {},
    MARKET_EXCHANGES: [{ id: 'm4', from: 'alchemy', to: 'chaos', need: 20, gain: 1 }],
    game: { currentZoneId: 'test', blackMarket: {}, currencies: {}, maxZoneId: 1 },
    getZone() { return { tier: 1 }; },
    rndChoice(list) { return list[0]; },
    chooseItemBase() { return this.BASE_ITEM_DB[0]; },
    hasSkillGemOwned() { return true; },
    rollBaseStats(base) { return base.baseStats.map(stat => ({ ...stat })); },
    getBaseChainInfo(base) { return base && base.id === 'apex_sword' ? { step: 5, total: 5 } : { step: 1, total: 5 }; },
    getStatName(id) { return id; },
    formatValue(_id, value) { return String(value); },
    escapeHTML(value) { return String(value); }
  };
}

function installFunctions(sandbox) {
  vm.createContext(sandbox);
  vm.runInContext([
    'const BLACK_MARKET_T20_RARE_BASE_CHANCE = 0.001;',
    extractFunctionBlock(source, 'isBaseEligibleForBlackMarket'),
    extractFunctionBlock(source, 'rollBlackMarketExchangeOffer'),
    extractFunctionBlock(source, 'getBlackMarketBaseChainInfo'),
    extractFunctionBlock(source, 'rollBlackMarketBaseStats'),
    extractFunctionBlock(source, 'maybeApplyBlackMarketExceptionalBaseStats'),
    extractFunctionBlock(source, 'chooseBlackMarketBase'),
    extractFunctionBlock(source, 'getBlackMarketBaseRollRange'),
    extractFunctionBlock(source, 'getBlackMarketBaseTooltipOptionLines'),
    extractFunctionBlock(source, 'getBlackMarketOfferTooltipHtml'),
    extractFunctionBlock(source, 'buildBlackMarketOffer'),
    'this.rollBlackMarketExchangeOffer = rollBlackMarketExchangeOffer;',
    'this.isBaseEligibleForBlackMarket = isBaseEligibleForBlackMarket;',
    'this.buildBlackMarketOffer = buildBlackMarketOffer;',
    'this.getBlackMarketOfferTooltipHtml = getBlackMarketOfferTooltipHtml;'
  ].join('\n'), sandbox);
}

withRandomSequence([0, 0.5, 0.5], mathObject => {
  const sandbox = createSandbox(mathObject);
  installFunctions(sandbox);
  const offer = sandbox.rollBlackMarketExchangeOffer({ id: 'm4', from: 'alchemy', to: 'chaos', need: 20, gain: 1 }, 0);
  assert.strictEqual(offer.bulkMultiplier, 100, 'very low exchange roll must create a 100x bundle');
  assert.strictEqual(offer.need, 1600, '100x exchange must multiply the input cost');
  assert.strictEqual(offer.gain, 100, '100x exchange must multiply the output reward');
});

withRandomSequence([0.001, 0.5, 0.5], mathObject => {
  const sandbox = createSandbox(mathObject);
  installFunctions(sandbox);
  const offer = sandbox.rollBlackMarketExchangeOffer({ id: 'm4', from: 'alchemy', to: 'chaos', need: 20, gain: 1 }, 0);
  assert.strictEqual(offer.bulkMultiplier, 10, 'rare exchange roll must create a 10x bundle');
  assert.strictEqual(offer.need, 160, '10x exchange must multiply the input cost');
  assert.strictEqual(offer.gain, 10, '10x exchange must multiply the output reward');
});

withRandomSequence([0.01, 0.75, 0.5, 0.5], mathObject => {
  const sandbox = createSandbox(mathObject);
  installFunctions(sandbox);
  const offer = sandbox.rollBlackMarketExchangeOffer({ id: 'm4', from: 'alchemy', to: 'chaos', need: 20, gain: 1 }, 0);
  assert.strictEqual(offer.bulkMultiplier, 5, 'uncommon exchange roll must create a 2~5x bundle');
  assert.strictEqual(offer.need, 80, '5x exchange must multiply the input cost');
  assert.strictEqual(offer.gain, 5, '5x exchange must multiply the output reward');
});

withRandomSequence([0.5, 0, 0, 0], mathObject => {
  const sandbox = createSandbox(mathObject);
  installFunctions(sandbox);
  assert.strictEqual(sandbox.isBaseEligibleForBlackMarket(sandbox.BASE_ITEM_DB[2]), false, 'realm-exclusive bases must not be eligible');
  const offer = sandbox.buildBlackMarketOffer(0);
  assert.strictEqual(offer.type, 'baseItem', 'forced market roll must create a base offer');
  assert.strictEqual(offer.baseId, 'apex_sword', 'rare base roll must allow a T20 base even in a low-tier zone');
  assert.strictEqual(offer.rareT20Base, true, 'T20 base offers must be marked as rare T20 bases');
  assert.strictEqual(offer.baseChainStep, 5, 'base offer must store its chain step');
  assert.strictEqual(offer.baseChainTotal, 5, 'base offer must store its chain total');
  assert.strictEqual(offer.exceptionalBase, true, 'exceptional base roll must mark the offer');
  assert.strictEqual(offer.baseStats[0].exceptional, true, 'exceptional base offer must persist boosted base stats');
  const html = sandbox.getBlackMarketOfferTooltipHtml(offer);
  assert(html.includes('베이스 체인 5/5'), 'base tooltip must display chain progress');
  assert(html.includes('T20 희귀 베이스'), 'base tooltip must display T20 rare marker');
  assert(html.includes('특출난 베이스'), 'base tooltip must display exceptional marker');
});

console.log('black market exchange and base smoke checks passed');
