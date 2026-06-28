const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const dataSource = fs.readFileSync('data/items.js', 'utf8');
const stateSource = fs.readFileSync('js/state.js', 'utf8');
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const itemsSource = fs.readFileSync('js/items.js', 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(dataSource, sandbox);


function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} must exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') depth--;
    if (depth === 0) return source.slice(start, i + 1);
  }
  assert.fail(`${name} must have a closed body`);
}

function createDropRuntime(zone, targetName) {
  const target = uniqueDb.find(unique => unique && unique.name === targetName);
  assert(target, `${targetName} must exist before drop runtime`);
  return {
    UNIQUE_DB: uniqueDb,
    EQUIPMENT_DROP_SLOTS: ['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠', '방패'],
    BASE_ITEM_DB: [{ id: 'test_base', slot: target.slots[0], name: '테스트 베이스', reqTier: target.reqTier || 1, baseStats: [{ id: 'flatHp', base: 1 }] }],
    UNIQUE_FIXED_BASE_BY_NAME: {},
    game: { currentZoneId: zone.id, seasonChaseUniqueDrops: [] },
    itemIdCounter: 0,
    Math: Object.create(Math),
    getZone() { return zone; },
    rndChoice(list) { return list.find(row => row && row.name === targetName) || list[0]; },
    chooseItemBase() { return { id: 'test_base', slot: target.slots[0], name: '테스트 베이스', reqTier: target.reqTier || 1, baseStats: [{ id: 'flatHp', base: 1 }] }; },
    rollBaseStats() { return []; },
    rollUniqueStatValue(stat) { return { val: stat.min, min: stat.min, max: stat.max }; },
    maybeApplyExceptionalBase(item) { return item; },
    getStatName(id) { return id; },
    addLog() {}
  };
}

function assertRealmDrop(zone, targetName) {
  const runtime = createDropRuntime(zone, targetName);
  runtime.Math.random = () => 0;
  vm.createContext(runtime);
  vm.runInContext(`${extractFunction(passivesSource, 'generateUniqueItem')}; this.generateUniqueItem = generateUniqueItem;`, runtime);
  const target = uniqueDb.find(unique => unique && unique.name === targetName);
  const item = runtime.generateUniqueItem(target.reqTier || zone.tier || 20, target.slots[0]);
  assert.strictEqual(item.name, targetName, `${targetName} must drop from its realm`);
  assert.strictEqual(item.uniqueEffectKey, target.uniqueEffectKey, `${targetName} drop must carry its unique effect`);
}

const uniqueDb = sandbox.window.UNIQUE_DB;
const expected = [
  { name: '폭풍의 눈', type: 'chaosRealm', slot: '투구', key: 'dragonVeinGuard', minStats: 5 },
  { name: '대지의 태동', type: 'underworld', slot: '갑옷', key: 'fixedAllMaxRes', minStats: 5 },
  { name: '사건의 지평선', type: 'cosmos', slot: '목걸이', key: 'uniqueGemLevelBonus', minStats: 5 },
  { name: '만화경', type: 'chaosRealm', slot: '방패', key: 'kaleidoscopeShield', minStats: 0 },
  { name: '무한한 허기', type: 'underworld', slot: '허리띠', key: 'stealEliteTrait', minStats: 5 },
  { name: '거울 반지', type: 'cosmos', slot: '반지', key: 'mirrorOppositeRing', minStats: 0 }
];

expected.forEach(({ name, type, slot, key, minStats }) => {
  const row = uniqueDb.find(unique => unique && unique.name === name);
  assert(row, `${name} must exist in UNIQUE_DB`);
  assert.strictEqual(row.ultraRare, true, `${name} must be an ultra-rare chase unique`);
  assert(row.dropOnly && row.dropOnly.type === type && Object.keys(row.dropOnly).length === 1, `${name} must only drop in ${type}`);
  assert.strictEqual(JSON.stringify(row.slots), JSON.stringify([slot]), `${name} must use the requested slot`);
  assert(Array.isArray(row.stats) && row.stats.length >= minStats, `${name} must have the requested stat line shape`);
  assert.strictEqual(row.uniqueEffectKey, key, `${name} must use its requested implemented unique effect`);
});


expected.forEach(({ name, type }) => {
  const zone = { id: `${type}_test`, type, tier: 30, floor: 30 };
  assertRealmDrop(zone, name);
});

vm.runInContext(`${extractFunction(itemsSource, 'isUniqueEligibleForBlackMarket')}; this.isUniqueEligibleForBlackMarket = isUniqueEligibleForBlackMarket;`, sandbox);
expected.forEach(({ name }) => {
  const row = uniqueDb.find(unique => unique && unique.name === name);
  assert.strictEqual(sandbox.isUniqueEligibleForBlackMarket(row), false, `${name} must not appear in black market`);
});

assert(!uniqueDb.some(unique => unique && unique.name === '왕 없는 왕관'), 'removed crown must not remain in UNIQUE_DB');
assert(stateSource.includes("id: 'mirror_ring'") && stateSource.includes("name: '거울 반지'") && stateSource.includes('baseStats: []'), 'mirror ring base must exist with no base options');
assert(passivesSource.includes("'거울 반지': 'mirror_ring'"), 'mirror ring unique must use the mirror ring base');
['fixedAllMaxRes', 'kaleidoscopeShield', 'stealEliteTrait', 'mirrorOppositeRing'].forEach(key => {
  assert(combatSource.includes(`'${key}'`), `${key} must be registered as implemented`);
});
assert(combatSource.includes('grantEliteTraitBuffFromEnemy'), 'elite trait steal runtime must be wired on enemy death');
assert(combatSource.includes('getMirrorRingSourceItem'), 'mirror ring copy runtime must be wired in stat calculation');
assert(passivesSource.includes('getAvailableModSlotsForItem') && passivesSource.includes('EQUIPMENT_DROP_SLOTS.slice()'), 'kaleidoscope shield must roll every slot option pool');
assert(passivesSource.includes("getItemExplicitOptionCount(item) <= 6"), 'kaleidoscope shield must keep tainted orb enabled through six options');

console.log('realm chase unique smoke checks passed');
