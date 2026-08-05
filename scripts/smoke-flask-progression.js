const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const itemSource = fs.readFileSync('data/items.js', 'utf8');
const itemStart = itemSource.indexOf('const FLASK_HEAL_TIERS =');
const itemEnd = itemSource.indexOf('const ORB_DB =', itemStart);
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const combatStart = combatSource.indexOf('const FLASK_UTILITY_SLOT_HARD_CAP =');
const combatEnd = combatSource.indexOf('const LEGACY_FLASK_UTILITY_KEYS =', combatStart);
assert(itemStart >= 0 && itemEnd > itemStart, 'flask definitions not found');
assert(combatStart >= 0 && combatEnd > combatStart, 'flask progression helpers not found');

const logs = [];
const context = {
  console,
  Math,
  game: {
    level: 13,
    flasks: { foundKeys: ['h1', 'granite1'], alchemyGlass: 16, qualityByKey: {} },
    noti: {},
    settings: { showLootLog: false }
  },
  addLog(message) { logs.push(message); },
  updateStaticUI() {},
  requestGoalSystemRefresh() {},
  remapLegacyFlaskKey(key) { return key; },
  ensureFlaskState() {
    context.game.flasks.alchemyGlass = Math.max(0, Math.floor(Number(context.game.flasks.alchemyGlass) || 0));
    context.game.flasks.qualityByKey = context.game.flasks.qualityByKey || {};
    return context.game.flasks;
  }
};
vm.createContext(context);
vm.runInContext(itemSource.slice(itemStart, itemEnd), context, { filename: 'data/items.js#flasks' });
vm.runInContext(combatSource.slice(combatStart, combatEnd), context, { filename: 'js/combat.js#flasks' });

assert.ok(context.getFlaskDiscoveryTierMultiplier('h1') > context.getFlaskDiscoveryTierMultiplier('h5'), 'high-tier natural discovery should be rarer');
assert.ok(context.getFlaskCraftCost('h5') > context.getFlaskCraftCost('h2'), 'high-tier deterministic crafting should cost more');
assert.strictEqual(context.craftFlask('h2'), true, 'the next healing tier should be craftable with enough glass');
assert.ok(context.game.flasks.foundKeys.includes('h2'));
assert.strictEqual(context.game.flasks.alchemyGlass, 0);
assert.strictEqual(context.craftFlask('h3'), false, 'crafting should fail when alchemy glass is insufficient');
assert.ok(logs.some(message => message.includes('연금 유리가 부족')));
context.game.flasks.alchemyGlass = 2;
assert.strictEqual(context.upgradeFlaskQuality('h2'), true, 'found flask quality should be craftable with glass');
assert.strictEqual(context.getFlaskQuality('h2'), 1);
assert.ok(vm.runInContext('getFlaskEffectiveHealPct(FLASK_DB.h2) > FLASK_DB.h2.healPct', context));

console.log('smoke-flask-progression passed');
