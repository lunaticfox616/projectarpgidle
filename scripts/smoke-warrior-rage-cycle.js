const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const stateSource = fs.readFileSync('js/state.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const start = combatSource.indexOf('const WARRIOR_RAGE_STACK_MAX');
const end = combatSource.indexOf('function clearAscendKeystoneRuntimeState', start);
assert(start >= 0 && end > start, 'warrior rage rules should be executable in isolation');

const context = {
    Date,
    Math,
    Number,
    game: { ascendClass: 'warrior', warriorRageStacks: 0, warriorRageExpiresAt: 0 },
    hasKeystone: id => id === 'w5'
};
vm.createContext(context);
vm.runInContext(combatSource.slice(start, end), context, { filename: 'warrior-rage-cycle.js' });

for (let hit = 0; hit < 7; hit++) context.grantWarriorRageOnHit(1000 + hit * 100);
assert.strictEqual(context.game.warriorRageStacks, 5, 'rage should stop at five stacks');
assert.strictEqual(context.game.warriorRageExpiresAt, 6600, 'each successful hit should refresh the five-second duration');
assert.strictEqual(context.getWarriorRagePhysicalDamageMultiplier(2000), 1.5, 'five stacks should multiply physical damage by 50%');
assert.strictEqual(context.getWarriorRagePhysicalDamageMultiplier(6600), 1, 'expired rage should stop affecting damage');

const triggerIndex = combatSource.indexOf('grantWarriorRageOnHit(Date.now());');
const absorbIndex = combatSource.indexOf('let remaining = dmg;', triggerIndex);
assert(triggerIndex >= 0 && absorbIndex > triggerIndex, 'a successful hit should grant rage before summon, ward, or energy-shield absorption');
assert(combatSource.includes("skill.ele === 'phys' ? warriorPhysDamageMultiplier : 1"), 'displayed physical DPS should include rage');
assert(combatSource.includes('getWarriorRageStacks, clearAscendKeystoneRuntimeState'), 'the HUD rage reader should be exposed explicitly');
assert(stateSource.includes('물리 피해 +10% (최대 5중첩, 곱연산)'), 'the keystone description should advertise ten percent per stack');
assert(uiSource.includes('격노 순환 ${rageStacks}/5 · ${rageSeconds}s'), 'the combat HUD should expose rage stacks and remaining duration');

console.log('smoke-warrior-rage-cycle passed');
