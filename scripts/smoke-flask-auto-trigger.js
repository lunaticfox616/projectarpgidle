const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('js/combat.js', 'utf8');
const start = source.indexOf("const FLASK_AUTO_TRIGGER_ORDER =");
const end = source.indexOf('function getMaxFlaskUtilitySlotCount()', start);
assert(start >= 0 && end > start, 'flask trigger helpers not found');

const context = {};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);

const normal = [{ hp: 10, isElite: false, isBoss: false }];
const elite = [{ hp: 10, isElite: true, isBoss: false }];
const boss = [{ hp: 10, isElite: false, isBoss: true }];

context.normal = normal;
context.elite = elite;
context.boss = boss;
assert.strictEqual(vm.runInContext("shouldAutoUseUtilityFlask('combat', normal, 100)", context), true);
assert.strictEqual(vm.runInContext("shouldAutoUseUtilityFlask('elite', normal, 100)", context), false);
assert.strictEqual(vm.runInContext("shouldAutoUseUtilityFlask('elite', elite, 100)", context), true);
assert.strictEqual(vm.runInContext("shouldAutoUseUtilityFlask('boss', boss, 100)", context), true);
assert.strictEqual(vm.runInContext("shouldAutoUseUtilityFlask('boss', elite, 100)", context), false);
assert.strictEqual(vm.runInContext("shouldAutoUseUtilityFlask('lowHp', normal, 50)", context), true);
assert.strictEqual(vm.runInContext("shouldAutoUseUtilityFlask('lowHp', normal, 50.1)", context), false);
assert.strictEqual(vm.runInContext("getUtilityFlaskTriggerLabel('bad-save')", context), '전투 시작');

assert.ok(source.includes('utilityChargeBank'), 'utility flask charge bank must persist swaps');
assert.ok(source.includes('lastAutoEncounter'), 'encounter-limited auto triggers must be latched');
assert.ok(source.includes('healChargeProgress'), 'healing flask charge progress must be independent');
assert.ok(source.includes('applyFlaskHealProgress'), 'healing over time must use elapsed-time progress');
assert.ok(!source.includes('st.killCounter % healChargesPerKills'), 'global kill modulo must not drive flask charges');

console.log('smoke-flask-auto-trigger passed');
