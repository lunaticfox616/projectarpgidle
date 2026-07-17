const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
  console,
  window: null,
  globalThis: null,
  safeExposeGlobals(map) { Object.assign(context, map); }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/items.js', 'utf8'), context, { filename: 'js/items.js' });

const average = context.getAverageExplicitAffixTier([
  {
    rarity: 'rare',
    hiddenTier: 20,
    stats: [
      { id: 'flatHp', tier: 4 },
      { id: 'resAll', tier: 7 },
      { id: 'chaosPctDmg', tier: 10, encroachedFinal: true }
    ],
    chaosInfusion: { id: 'crit', tier: 10, sourceOptionId: 'infusion_crit' }
  },
  {
    rarity: 'unique',
    stats: [{ id: 'flatDmg', tier: 10 }]
  },
  {
    rarity: 'magic',
    stats: [{ id: 'move', tier: 5 }]
  }
]);

assert.strictEqual(average, (4 + 7 + 5) / 3, 'only regular explicit affix tiers should contribute to the average');
assert.strictEqual(context.getAverageExplicitAffixTier([]), 0);
console.log('smoke-equipment-affix-tier passed');
