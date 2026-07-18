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

const passiveSource = fs.readFileSync('js/passives.js', 'utf8');
const tierBlockStart = passiveSource.indexOf('function getTierVisualLevel');
const tierBlockEnd = passiveSource.indexOf('function getUniqueCodexKeyByItem', tierBlockStart);
assert(tierBlockStart >= 0 && tierBlockEnd > tierBlockStart, 'tier badge helpers must remain available');
const tierContext = {
  Number,
  Math,
  clampNumber(value, min, max) { return Math.min(max, Math.max(min, value)); }
};
vm.createContext(tierContext);
vm.runInContext(passiveSource.slice(tierBlockStart, tierBlockEnd), tierContext, { filename: 'equipment-tier-badges.js' });
assert(tierContext.getTierBadgeHtml(10, 'T').includes('[T10]'));
assert(tierContext.getTierBadgeHtml(14, 'T').includes('[T14]'), 'actual T11~T15 affixes must not be mislabeled as T10');
assert(tierContext.getTierBadgeHtml(14, 'T').includes('tier-10'), 'T11~T15 may reuse the top-tier visual style without hiding their real tier');

const realmTierStart = passiveSource.indexOf('function getRealmEquipmentHiddenTierCap');
const realmTierEnd = passiveSource.indexOf('function getCraftTierRangeForItem', realmTierStart);
assert(realmTierStart >= 0 && realmTierEnd > realmTierStart, 'realm affix tier boundary helpers must remain available');
const realmTierContext = { Number, Math };
vm.createContext(realmTierContext);
vm.runInContext(passiveSource.slice(realmTierStart, realmTierEnd), realmTierContext, { filename: 'realm-affix-tier-cap.js' });
assert.strictEqual(realmTierContext.getRealmEquipmentAffixTierCap({ type: 'abyss', tier: 15 }, 15), 10, 'non-cosmos drops must never unlock T11~T15 affixes');
assert.strictEqual(realmTierContext.getRealmEquipmentAffixTierCap({ type: 'cosmos', tier: 1 }, 11), 11, 'the first cosmos drop tier should unlock T11 affixes');
assert.strictEqual(realmTierContext.getRealmEquipmentAffixTierCap({ type: 'cosmos', tier: 20 }, 14), 14, 'cosmos drops should preserve their progressive high-tier cap');
assert(passiveSource.includes("{ dropRealm: zone.type || null, affixTierCap }"), 'equipment drops must persist their realm provenance and affix cap');
assert(passiveSource.includes("rerollExplicitMods(item, rarity, affixTierCap)"), 'initial explicit rolls must use the provenance-aware affix cap');

const beltRangeStart = passiveSource.indexOf('function getBeltFlaskUtilSlotRollRange');
const beltRangeEnd = passiveSource.indexOf('function rollBaseStats', beltRangeStart);
assert(beltRangeStart >= 0 && beltRangeEnd > beltRangeStart, 'belt flask slot range helper must remain available');
const beltContext = { Number, Math };
vm.createContext(beltContext);
vm.runInContext(passiveSource.slice(beltRangeStart, beltRangeEnd), beltContext, { filename: 'belt-flask-slot-range.js' });
assert.deepStrictEqual({ ...beltContext.getBeltFlaskUtilSlotRollRange(5) }, { min: 1, max: 1 });
assert.deepStrictEqual({ ...beltContext.getBeltFlaskUtilSlotRollRange(10) }, { min: 1, max: 2 });

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
assert(uiSource.includes('🍯 벌꿀 고정'), 'honey-locked affixes must be identified in the regular custom tooltip');
assert(!uiSource.includes('return `${statePrefix} · 상시 효과`;'), 'unique tooltips must not show the redundant current/permanent-effect hint');
console.log('smoke-equipment-affix-tier passed');
