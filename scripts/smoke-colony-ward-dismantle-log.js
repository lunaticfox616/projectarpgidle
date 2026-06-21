const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const block = uiSource.match(/function isLockedInventoryObject\(obj\) \{[\s\S]*?function bulkDismantleColonyWardsBySearch\(salvageUnmatched\) \{/);
assert(block, 'colony ward dismantle block must be extractable');
assert(!uiSource.includes("액막이 부적 해체: ${ward.name || '액막이'}"), 'single colony ward dismantle log must not include the ward option name');

let logMessage = '';
const game = { currencies: { colonyShard: 0 }, colony: { wardInventory: [{ id: 'ward-1', name: '액막이 부적 · 최대 생명력 +120', val: 120 }] } };
const context = {
  game,
  assertBuildEditable() { return true; },
  getColonyWardDismantleReward(ward) { return Math.max(1, Math.min(6, 1 + Math.floor(Math.abs(Number(ward.val || 0)) / 40))); },
  normalizeColonyWardState() { return game.colony; },
  addLog(message) { logMessage = message; },
  updateStaticUI() {},
};
vm.createContext(context);
vm.runInContext(`${block[0]}\n}`, context);
vm.runInContext(`dismantleColonyWardById('ward-1')`, context);
assert.strictEqual(context.game.colony.wardInventory.length, 0, 'dismantle must remove the selected colony ward');
assert.strictEqual(context.game.currencies.colonyShard, 4, 'dismantle reward must still be granted from the hidden option value');
assert(!logMessage.includes('최대 생명력') && !logMessage.includes('+120'), 'dismantle log must hide the dismantled colony ward option');
assert(logMessage.includes('군락지 편린 +4'), 'dismantle log must still show the gained shard count');
