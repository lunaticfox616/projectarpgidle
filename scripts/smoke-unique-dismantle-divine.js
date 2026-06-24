#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
const itemsSource = fs.readFileSync('data/items.js', 'utf8');

assert(passivesSource.includes('return Math.min(0.12, 0.01 + ((tier - 1) / 14) * 0.11);'), 'unique dismantle divine chance must be a direct tier scale capped at 12%');
assert(passivesSource.includes('if (isChaseUniqueItem(item)) return 1;'), 'chase unique dismantle divine chance must be guaranteed');
assert(!passivesSource.includes('Math.random() < 0.12) awardCurrency(\'divine\''), 'unique dismantle must not keep the flat 12% divine chance');

function extractFunction(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert(match, `${name} must exist`);
  return match[0];
}

const dataContext = { window: {} };
dataContext.window = dataContext;
vm.createContext(dataContext);
vm.runInContext(itemsSource, dataContext);

function createRuntime(randomValues) {
  let randomIndex = 0;
  const math = Object.create(Math);
  math.random = () => (randomIndex < randomValues.length ? randomValues[randomIndex++] : 0.99);
  const currencies = {};
  const context = {
    Math: math,
    UNIQUE_DB: dataContext.UNIQUE_DB,
    currencies,
    awardCurrency(key, amount) { currencies[key] = (currencies[key] || 0) + amount; },
    addLog() {},
    clampNumber(value, min, max) { return Math.max(min, Math.min(max, value)); },
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(passivesSource, 'getItemCraftTier'),
    extractFunction(passivesSource, 'isChaseUniqueItem'),
    extractFunction(passivesSource, 'getUniqueDismantleDivineChance'),
    extractFunction(passivesSource, 'salvageItemObject'),
    'this.getUniqueDismantleDivineChance = getUniqueDismantleDivineChance;',
    'this.salvageItemObject = salvageItemObject;'
  ].join('\n'), context);
  return context;
}

let lowTier = createRuntime([]);
assert.strictEqual(lowTier.getUniqueDismantleDivineChance({ rarity: 'unique', name: '첫 계약', hiddenTier: 1 }), 0.01, 'tier 1 unique dismantle divine chance must be 1%');
let highTier = createRuntime([]);
assert.strictEqual(highTier.getUniqueDismantleDivineChance({ rarity: 'unique', name: '일반 고유', hiddenTier: 15 }), 0.12, 'tier 15 unique dismantle divine chance must be 12%');
let overCap = createRuntime([]);
assert.strictEqual(overCap.getUniqueDismantleDivineChance({ rarity: 'unique', name: '일반 고유', hiddenTier: 99 }), 0.12, 'unique dismantle divine chance must be capped at 12%');
let chase = createRuntime([]);
assert.strictEqual(chase.getUniqueDismantleDivineChance({ rarity: 'unique', name: '초월자 파쇄검', hiddenTier: 1 }), 1, 'chase unique dismantle divine chance must be 100%');

let lowDrop = createRuntime([0.009, 0.99]);
lowDrop.salvageItemObject({ rarity: 'unique', name: '첫 계약', hiddenTier: 1 }, true);
assert.strictEqual(lowDrop.currencies.divine, 1, 'tier 1 unique must award divine below 1% threshold');
let lowMiss = createRuntime([0.011, 0.99]);
lowMiss.salvageItemObject({ rarity: 'unique', name: '첫 계약', hiddenTier: 1 }, true);
assert.strictEqual(lowMiss.currencies.divine || 0, 0, 'tier 1 unique must not use the old 12% flat threshold');
let chaseDrop = createRuntime([0.999999, 0.99]);
chaseDrop.salvageItemObject({ rarity: 'unique', name: '초월자 파쇄검', hiddenTier: 1 }, true);
assert.strictEqual(chaseDrop.currencies.divine, 1, 'chase unique dismantle must always award divine');

console.log('unique dismantle divine smoke checks passed');
