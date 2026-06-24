#!/usr/bin/env node
// Regression: 나무꾼의 손길(woodsmanTouch) seals a selected item (loopSealed) by
// consuming one charge; it is a no-op without a charge or on an already-sealed item.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
function extractFunction(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert(match, `${name} must exist`);
  return match[0];
}

function makeContext(currencyCount, selectedItem) {
  const ctx = {
    game: { currencies: { woodsmanTouch: currencyCount }, woodsmanBuildLock: false },
    getSelectedCraftItem: () => selectedItem,
    addLog: () => {},
    updateStaticUI: () => {},
    queueImportantSave: () => {},
  };
  vm.createContext(ctx);
  vm.runInContext(extractFunction(passivesSource, 'applyWoodsmanTouchToSelectedItem') + '\nthis.applyWoodsmanTouchToSelectedItem = applyWoodsmanTouchToSelectedItem;', ctx);
  return ctx;
}

// Has a charge + selected item → seals it, consumes one.
const sealItem = { name: '검' };
const ctx1 = makeContext(1, sealItem);
ctx1.applyWoodsmanTouchToSelectedItem();
assert.strictEqual(sealItem.loopSealed, true, 'item should be sealed');
assert.strictEqual(ctx1.game.currencies.woodsmanTouch, 0, 'one woodsmanTouch consumed');

// No charge → not sealed, nothing consumed.
const item2 = { name: '활' };
const ctx2 = makeContext(0, item2);
ctx2.applyWoodsmanTouchToSelectedItem();
assert(!item2.loopSealed, 'no seal without a charge');
assert.strictEqual(ctx2.game.currencies.woodsmanTouch, 0, 'still zero');

// Already sealed → no double consume.
const item3 = { name: '지팡이', loopSealed: true };
const ctx3 = makeContext(1, item3);
ctx3.applyWoodsmanTouchToSelectedItem();
assert.strictEqual(ctx3.game.currencies.woodsmanTouch, 1, 'already-sealed item must not consume a charge');

console.log('woodsman touch seal smoke checks passed');
