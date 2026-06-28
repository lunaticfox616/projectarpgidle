#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const ui = fs.readFileSync('js/ui.js', 'utf8');
const components = fs.readFileSync('css/components.css', 'utf8');

assert(ui.includes('function startBulkTalismanUnseal(currencyKey)'), 'talisman bulk unseal helper must exist');
assert(ui.includes("startBulkTalismanUnseal('sealShard')"), 'normal talisman shard bulk-unseal button must render');
assert(ui.includes("startBulkTalismanUnseal('strongSealShard')"), 'strong talisman shard bulk-unseal button must render');
assert(ui.includes("startBulkTalismanUnseal('radiantSealShard')"), 'radiant talisman shard bulk-unseal button must render');
assert(ui.includes('let jewelCraftOptionHtml = jewelCraftTarget'), 'selected jewel craft panel must build an option summary');
assert(ui.includes('${jewelCraftOptionHtml}<div style="display:flex; gap:6px; flex-wrap:wrap;">${jewelCraftButtons}</div>'), 'selected jewel option summary must render above orb buttons');
assert(ui.includes("'deepWhetstone','rootIron','jewelPolish','abyssCatalyst'].includes(key)"), 'quality currencies must be treated as craft orbs so desktop use buttons render');
assert(components.includes('body.has-bottom-tabs .tab-content { padding-bottom: calc(24px + var(--bottom-tab-height, 52px) + env(safe-area-inset-bottom))'), 'mobile tab content must reserve scroll padding above bottom tabs');
assert(components.includes('body.has-bottom-tabs #right-pane { padding-bottom: calc(var(--bottom-tab-height, 52px) + env(safe-area-inset-bottom) + 72px); }'), 'mobile right pane must reserve enough bottom space for the fixed bottom tab bar');

const start = ui.indexOf('function startBulkTalismanUnseal');
const end = ui.indexOf('\nfunction previewNextTalismanShape', start);
assert(start >= 0 && end > start, 'bulk talisman unseal helper must be extractable');
let updated = false;
const context = {
  game: { currencies: { sealShard: 12 }, talismanInventory: [] },
  Array,
  Math,
  Number,
  addLog(message) { this.lastLog = message; },
  updateStaticUI() { updated = true; },
  rollTalismanCandidate(key) { return { id: Math.random(), source: key, shape: 'O', stat: 'pctDmg' }; }
};
vm.createContext(context);
vm.runInContext(ui.slice(start, end), context);
context.startBulkTalismanUnseal('sealShard');
assert.strictEqual(context.game.currencies.sealShard, 2, 'bulk unseal must consume at most 10 shards');
assert.strictEqual(context.game.talismanInventory.length, 10, 'bulk unseal must create up to 10 talismans at once');
assert.strictEqual(context.game.talismanInventory.every(t => t.source === 'sealShard'), true, 'bulk unseal must use the selected shard source');
assert.strictEqual(updated, true, 'bulk unseal must refresh static UI');

console.log('ui crafting regression smoke checks passed');
