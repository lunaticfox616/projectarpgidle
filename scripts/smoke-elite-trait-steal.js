const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('js/combat.js', 'utf8');
assert(source.includes('trait: trait ? { ...trait } : null'), 'created elite enemies must retain their rolled trait payload');

const start = source.indexOf('function applyEliteTraitBuffStats(buff, bucket)');
const end = source.indexOf('function getPlayerStats()', start);
assert(start >= 0 && end > start, 'elite trait helpers not found');

const logs = [];
const context = {
    game: { settings: { showCombatLog: true } },
    Date,
    addLog: message => logs.push(message),
    addStatToBucket: (bucket, key, value) => { bucket[key] = (bucket[key] || 0) + value; }
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);

vm.runInContext(`grantEliteTraitBuffFromEnemy(
    { isElite: true, trait: { id:'swiftHands', name:'고속 공세', attackSpeedVarMul:1.18, resF:12 } },
    { uniqueStealEliteTrait: { duration:30 } }
)`, context);
assert(context.game.uniqueEliteTraitBuff, 'steal effect should create a timed buff');
assert.strictEqual(context.game.uniqueEliteTraitBuff.trait.name, '고속 공세');
assert(logs.some(line => line.includes('고속 공세')));

const bucket = {};
context.bucket = bucket;
vm.runInContext('applyEliteTraitBuffStats(game.uniqueEliteTraitBuff, bucket)', context);
assert(Math.abs(bucket.aspd - 18) < 0.0001, 'attack-speed trait should become player attack speed');
assert.strictEqual(bucket.resF, 12);

console.log('smoke-elite-trait-steal passed');
