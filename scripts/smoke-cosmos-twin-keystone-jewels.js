const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// --- data flags: balance/judgment jewels must be socket-restricted + keystone jewels ---
const itemsSource = fs.readFileSync('data/items.js', 'utf8');
['cbj_zubenubia_balance', 'cbj_zubenshamali_judgment'].forEach(id => {
  const row = itemsSource.match(new RegExp(`id: '${id}'[^}]*?\\}`));
  assert(row, `${id} jewel row must exist`);
  assert(/noEquipSocket: true/.test(row[0]), `${id} must be flagged noEquipSocket`);
  assert(/cosmosKeystoneJewel: true/.test(row[0]), `${id} must be flagged cosmosKeystoneJewel`);
});

// --- socket inserts must reject noEquipSocket jewels ---
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
const voidInsert = passivesSource.match(/function insertJewelIntoVoidSocket\(invIdx\) \{[\s\S]*?\n\}/);
const abyssInsert = passivesSource.match(/function insertJewelIntoAbyssSocket\(invIdx, socketIdx\) \{[\s\S]*?\n\}/);
assert(voidInsert && /jewel\.noEquipSocket/.test(voidInsert[0]), 'void socket insert must block noEquipSocket jewels');
assert(abyssInsert && /jewel\.noEquipSocket/.test(abyssInsert[0]), 'abyss socket insert must block noEquipSocket jewels');

// --- core grant logic from combat.js ---
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const block = combatSource.match(/function hasKeystone\(id\) \{[\s\S]*?function recomputeCosmosTwinKeystones\(\) \{[\s\S]*?\n\}/);
assert(block, 'twin keystone block must be extractable from combat.js');

function makeJewel(uniqueId, keystone) {
  return { uniqueId, cosmosKeystoneJewel: true, cosmosKeystone: keystone };
}

function runWith(jewelSlots) {
  const game = { ascendKeystones: [], jewelSlots, ascendClass: null };
  const context = { game, pickRandomAscendKeystoneId: () => 'gen1' };
  vm.createContext(context);
  vm.runInContext(block[0], context);
  vm.runInContext('recomputeCosmosTwinKeystones()', context);
  return context;
}

// matching keystone on both jewels -> granted + hasKeystone true
let ctx = runWith([makeJewel('cbj_zubenubia_balance', 'a7'), makeJewel('cbj_zubenshamali_judgment', 'a7')]);
assert.strictEqual(JSON.stringify(ctx.game.cosmosTwinKeystones), JSON.stringify(['a7']), 'matching twin jewels must grant the shared keystone');
assert.strictEqual(vm.runInContext("hasKeystone('a7')", ctx), true, 'granted keystone must register via hasKeystone');
assert.strictEqual(vm.runInContext("hasKeystone('w6')", ctx), false, 'unrelated keystone must not register');

// mismatched keystones -> no grant
ctx = runWith([makeJewel('cbj_zubenubia_balance', 'a7'), makeJewel('cbj_zubenshamali_judgment', 'w6')]);
assert.strictEqual(JSON.stringify(ctx.game.cosmosTwinKeystones), JSON.stringify([]), 'mismatched twin jewels must not grant a keystone');

// only one jewel equipped -> no grant
ctx = runWith([makeJewel('cbj_zubenubia_balance', 'a7'), null]);
assert.strictEqual(JSON.stringify(ctx.game.cosmosTwinKeystones), JSON.stringify([]), 'a single twin jewel must not grant a keystone');

// missing keystone is lazily assigned from the pool
ctx = runWith([{ uniqueId: 'cbj_zubenubia_balance', cosmosKeystoneJewel: true }]);
assert.strictEqual(ctx.game.jewelSlots[0].cosmosKeystone, 'gen1', 'legacy twin jewel must get a keystone assigned lazily');

// --- pool helper from state.js returns a valid ascend keystone id ---
const stateSource = fs.readFileSync('js/state.js', 'utf8');
const defsBlock = stateSource.match(/const CLASS_KEYSTONE_DEFS = \{[\s\S]*?\n\};/);
const helpersBlock = stateSource.match(/function getAllAscendKeystoneDefs\(\) \{[\s\S]*?function getAscendKeystoneName\(id\) \{[\s\S]*?\n\}/);
assert(defsBlock && helpersBlock, 'keystone defs + helpers must be extractable from state.js');
const stateCtx = {};
vm.createContext(stateCtx);
vm.runInContext(`${defsBlock[0]}\n${helpersBlock[0]}`, stateCtx);
const allDefs = vm.runInContext('getAllAscendKeystoneDefs()', stateCtx);
assert(allDefs.length > 40, 'ascend keystone pool must include every class keystone');
const picked = vm.runInContext('pickRandomAscendKeystoneId()', stateCtx);
assert(allDefs.some(n => n.id === picked), 'pickRandomAscendKeystoneId must return an id from the pool');
assert.strictEqual(vm.runInContext("getAscendKeystoneName('a7')", stateCtx), '살의 폭주', 'keystone name lookup must resolve');

console.log('smoke-cosmos-twin-keystone-jewels: OK');
