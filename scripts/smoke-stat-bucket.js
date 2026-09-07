const assert = require('node:assert/strict');
const { buildGameRuntime } = require('./lib/game-runtime');
const r = buildGameRuntime();
const b = r.createEmptyStatBucket();
r.applyStatsToBucket(b, [
    { id: 'flatDmg', val: '12', extraStats: [{ id: 'flatDmg', val: -2 }] },
    { id: 'resAll', val: 9 }, { id: 'chaosResElemPenalty', val: 4 },
    { id: 'hpArmor', val: 3 }, { id: 'moveEvasion', val: 2 }, { id: 'aspdMove', val: 5 },
    { id: 'deflectMajor', val: 0 }, { id: 'targetCount', val: 2 },
    { id: 'spellCritDmg', val: 15 }, { id: 'spellLeech', val: 0.5 }
]);
assert.equal(b.flatDmg, 10);
assert.deepEqual([b.resF, b.resC, b.resL, b.resChaos], [5, 5, 5, 4]);
assert.deepEqual([b.flatHp, b.armor, b.move, b.evasionPct, b.aspd], [3, 6, 7, 2, 5]);
assert.deepEqual([b.deflectChance, b.deflectDamageReduce], [0, 3], 'fixed component applies even with zero magnitude');
assert.deepEqual([b.targetAny, b.critDmg, b.leech], [2, 15, 0.5]);
const before = JSON.stringify(b);
for (const id of ['__proto__', 'constructor', 'toString', 'unknown', '', null, new String('flatDmg')]) r.addStatToBucket(b, id, 10);
for (const value of [NaN, Infinity, -Infinity, 'invalid']) r.addStatToBucket(b, 'flatDmg', value);
assert.equal(JSON.stringify(b), before, 'invalid stat input must not change state or add properties');
console.log('smoke-stat-bucket passed');
