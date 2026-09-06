// Regression: long returns execute equipment and progression rules beyond the old sample.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
function replay(ms) {
    const {runtime:r,state} = fixture(5);
    r.Math.random = () => 0.01;
    return r.simulateBackgroundCombat({snapshot:state,elapsedMs:ms});
}
const short = replay(10000), long = replay(150000);
assert.equal(long.processedMs,150000);
assert.equal(long.estimated,false);
assert.ok(long.metrics.kills > short.metrics.kills);
assert.ok(long.metrics.exp > short.metrics.exp);
assert.ok(long.game.inventory.length + long.game.offlineProgress.stash.length > short.game.inventory.length + short.game.offlineProgress.stash.length,'actual equipment must keep dropping beyond the sample');
assert.ok(long.game.runProgress > short.game.runProgress || long.game.currentZoneId !== short.game.currentZoneId,'real map progression must continue');
assert.equal(long.game.currencies.goldenRule,0,'rare rewards must not multiply a lucky sample');
console.log('smoke-background-extrapolation passed');
