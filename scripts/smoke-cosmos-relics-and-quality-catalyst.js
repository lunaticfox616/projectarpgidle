const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const dataSource = fs.readFileSync('data/items.js', 'utf8');
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const atlasSource = fs.readFileSync('js/cosmos-atlas.js', 'utf8');

const dataSandbox = {
  window: {},
  safeExposeData(map) { Object.assign(this.window, map); }
};
vm.createContext(dataSandbox);
vm.runInContext(dataSource, dataSandbox);

assert(dataSandbox.window.ORB_DB.abyssCatalyst, '심연 촉매 currency must be defined');
assert(dataSandbox.window.ORB_DB.abyssCatalyst.desc.includes('퀄리티 속성'), '심연 촉매 must describe quality attribute conversion');
const relicDb = dataSandbox.window.COSMOS_BOSS_RELIC_DB;
assert.strictEqual(Object.keys(relicDb).length, 5, 'five cosmos boss relic specs must exist');
Object.values(relicDb).forEach(relic => {
  assert(relic.id && relic.bossId && relic.name, 'relic specs must have identity fields');
});
const stonePools = dataSandbox.window.COSMOS_BOSS_STONE_OPTION_POOLS;
assert.strictEqual(Object.keys(stonePools).length, 6, 'six boss-stone option pools must exist when the faded boss jewel unlocks the sixth stone');
const baseStonePools = ['1', '2', '3', '4', '5'].map(key => stonePools[key]);
const allStoneStats = new Set();
baseStonePools.forEach(pool => {
  assert(Array.isArray(pool.options) && pool.options.length >= 20, 'each base stone must have at least 8 unique plus common/dud normal options');
  assert(Array.isArray(pool.bossOptions) && pool.bossOptions.length >= 3, 'each stone must have a boss option pool');
  pool.options.forEach(option => allStoneStats.add(option.stat));
});
assert(Array.isArray(stonePools['6'].options) && stonePools['6'].options.length >= 8, 'sixth boss-jewel stone must have its own stronger option pool');
const sixthStats = new Set(stonePools['6'].options.map(option => option.stat));
assert(!sixthStats.has('slamPctDmg') && !sixthStats.has('summonPctDmg') && !sixthStats.has('summonFlatDmg'), 'sixth stone must not roll slam or summon options');
stonePools['6'].options.forEach(option => allStoneStats.add(option.stat));
assert(allStoneStats.has('summonPctDmg') && allStoneStats.has('summonFlatDmg'), 'stone pools must include summon-related options');
assert(allStoneStats.has('dotPctDmg'), 'stone pools must include damage-over-time options');
assert(allStoneStats.has('slamPctDmg'), 'stone pools must include slam options');
const commonOptionCounts = new Map();
baseStonePools.forEach(pool => {
  pool.options.forEach(option => {
    const key = `${option.stat}|${option.min}|${option.max}|${option.label}`;
    commonOptionCounts.set(key, (commonOptionCounts.get(key) || 0) + 1);
  });
});
const sharedOptionKeys = [...commonOptionCounts.entries()]
  .filter(([, count]) => count === 5)
  .map(([key]) => key);
const sharedForbiddenStats = ['dotPctDmg', 'slamPctDmg', 'summonPctDmg', 'summonFlatDmg'];
assert(sharedOptionKeys.length >= 16, 'stone pools must include eight shared common and eight shared dud options');
sharedForbiddenStats.forEach(stat => {
  assert(!sharedOptionKeys.some(key => key.startsWith(`${stat}|`)), `${stat} must not be a shared common option`);
});
assert(!JSON.stringify(stonePools).includes('cosmosStoneSlotBonus'), 'boss-stone pools must not use the removed stone slot bonus option');
assert(!JSON.stringify(dataSandbox.window.COSMOS_BOSS_REWARD_DB).includes('cosmosStoneSlotBonus'), 'cosmos rewards must not grant the removed stone slot bonus stat');

const helperStart = passivesSource.indexOf('const QUALITY_ATTRIBUTE_MODES');
const helperEnd = passivesSource.indexOf('function getAnnulmentRemovableStats', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'quality/relic helper block must exist');
const helperContext = {
  game: {
    cosmosAtlas: {
      equippedStoneGalaxy: 2,
      equippedStones: { '1': true },
      bossRelics: [{ relicId: 'legacy-currency', rerollStoneOption: true }],
      bossStoneOptions: {
        '1': [{ stat: 'pctDmg', value: 5 }],
        '3': [{ stat: 'crit', value: 9 }]
      }
    }
  },
  safeExposeGlobals(map) { Object.assign(this, map); }
};
vm.createContext(helperContext);
vm.runInContext(passivesSource.slice(helperStart, helperEnd), helperContext);
assert.strictEqual(helperContext.getItemQualityAttributeMode({}), 'base', 'missing quality attribute must be base');
assert.strictEqual(helperContext.isQualityAttributeStat('fire', 'firePctDmg'), true, 'fire quality must affect fire explicit stats');
assert.strictEqual(helperContext.isQualityAttributeStat('fire', 'resC'), false, 'fire quality must not affect cold stats');
const convertedItem = { qualityAttribute: 'base' };
assert.strictEqual(helperContext.applyAbyssCatalystToItemQuality(convertedItem), '화염', 'catalyst must cycle base quality to fire quality');
assert.strictEqual(convertedItem.qualityAttribute, 'fire', 'catalyst must persist the next quality mode');
const relicTotals = helperContext.getCosmosBossRelicStatTotals();
assert.strictEqual(relicTotals.pctDmg, 5, 'equipped boss stone must activate eligible stone option stats');
assert.strictEqual(relicTotals.crit, undefined, 'unequipped stone options must stay inactive until the matching boss stone is equipped');

assert(passivesSource.includes("currencyKey === 'abyssCatalyst'"), 'useCurrency must support abyss catalyst');
assert(passivesSource.includes("drops.push(['abyssCatalyst', 1])"), 'cosmos bosses must be able to drop abyss catalyst');
assert(combatSource.includes('getItemQualityAttributeMode'), 'combat must read item quality attribute mode');
assert(combatSource.includes('isQualityAttributeStat'), 'combat must scale matching explicit stats for attribute quality');
assert(combatSource.includes('getCosmosBossRelicStatTotals'), 'combat must apply active boss-stone option stats');
assert(combatSource.includes('leechKeepFullLife'), 'combat must implement the Diphdar boss jewel leech persistence stat');
assert(combatSource.includes('hasAdjacentRepulsion') && combatSource.includes('getRepulsionMultiplier'), 'combat must implement Enifron repulsion talisman adjacency behavior');
assert(!atlasSource.includes("'유물 파편', '심연 촉매'"), 'boss relic drops must not remain a random placeholder table');
assert(atlasSource.includes('ensureCosmosStoneOptions'), 'atlas must create three-option boss stones');
assert(atlasSource.includes('applyCosmosBossRelicToStone'), 'atlas must let boss relics reroll a random stone option into a boss option');
assert(atlasSource.includes('findCosmosBossRelicIndexForStone'), 'atlas must consume matching boss relics for stone rerolls');
assert(atlasSource.includes("delete state.equippedStones['6']"), 'atlas must remove stale sixth-stone equip state when the jewel unlock is gone');
assert(atlasSource.includes('hasSixthCosmosStoneUnlock'), 'atlas must reveal the sixth stone through the faded boss jewel');
assert(atlasSource.includes("jewel.uniqueId === 'cbj_enifron_faded_stone'"), 'sixth-stone unlock must check boss jewel uniqueId, not only display name');
assert(atlasSource.includes('unequipBossStoneByGalaxy'), 'atlas must support unequipping boss stones');
assert(atlasSource.includes('showCosmosStoneTooltip'), 'atlas must expose custom boss-stone tooltips');
assert(atlasSource.includes('우주계 최소 티어 보정'), 'boss-stone tooltip must show tier-floor correction tiers');
assert(atlasSource.includes('COSMOS_STONE_TIER_FLOORS = [1, 6, 11, 16, 21, 25]'), 'boss-stone tier floors must use 6/11/16/21/25 without sixth-stone extra correction');
assert(atlasSource.includes('Math.min(5, getEquippedCosmosStoneCount(state))'), 'sixth stone must not increase the minimum tier correction');
assert(atlasSource.includes('drawCosmosStonePulse'), 'atlas must animate the affected cosmos area when equipping a stone');
assert(combatSource.includes('game.cosmosAtlas.bossStoneOptions = {};'), 'loop reset must clear boss-stone option rolls');
assert(combatSource.includes('game.cosmosAtlas.bossStones = {};'), 'loop reset must clear boss-stone acquisition state');
assert(atlasSource.includes('cloneCosmosBossRelic'), 'atlas must create structured relic currency drops');
assert(atlasSource.includes('COSMOS_BOSS_RELIC_DB'), 'atlas must use the relic DB for boss relic drops');

console.log('smoke-cosmos-relics-and-quality-catalyst passed');
