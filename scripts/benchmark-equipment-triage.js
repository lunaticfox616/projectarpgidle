'use strict';
// Synthetic full build; measures computation separately from browser timer/render delays.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const fixture = require('./lib/replay-fixture');
const configureEndgame = require('./lib/offline-endgame-fixture');
const revision = process.argv[2];
assert.ok(revision, 'Pass the pre-change revision explicitly');
const oldSource = execFileSync('git', ['show', `${revision}:js/equipment-triage.js`], {encoding:'utf8'});
const before = fixture(17, {'js/equipment-triage.js':oldSource});
const after = fixture(17);
for (const target of [before, after]) {
    target.run(`(${configureEndgame.toString()})();
        const gear = Object.values(game.equipment).filter(Boolean);
        game.inventory = Array.from({length:120}, (_,i) => {
            const item = JSON.parse(JSON.stringify(gear[i % gear.length]));
            item.id = 90000+i; item.stats.push({id:'flatDmg', val:i+10}); return item;
        });
        getPlayerStats();
    `);
    target.runtime.document.getElementById = () => null;
    target.runtime.updateStaticUI = () => {};
    target.pending = [];
    target.runtime.setTimeout = fn => {target.pending.push(fn); return target.pending.length;};
    target.runtime.clearTimeout = () => {};
}
function measure(target) {
    const start = performance.now();
    assert.equal(target.runtime.equipmentTriage.start(), true);
    while (target.pending.length) target.pending.shift()();
    const elapsed = performance.now() - start;
    const results = target.run('game.inventory').map(item => target.runtime.equipmentTriage.getResult(item));
    assert.ok(results.every(Boolean));
    return {elapsed,results:JSON.stringify(results)};
}
measure(before); measure(after);
const samples = {before:[], after:[]};
for (let round = 0; round < 5; round++) {
    const b = measure(before), a = measure(after);
    assert.equal(a.results, b.results, 'stable combat/build must keep all candidate scores identical');
    samples.before.push(b.elapsed); samples.after.push(a.elapsed);
}
const median = xs => xs.sort((a,b) => a-b)[2];
const beforeMs = median(samples.before), afterMs = median(samples.after);
const report = {revision, scenario:'Synthetic endgame, 120 items, 100 passives, full growth board, eight summons',
    method:'Node VM, median of five batches, timers drained synchronously; excludes browser rendering/wait time',
    beforeMs,afterMs,reductionPct:100*(1-afterMs/beforeMs),identicalCandidateScores:120};
fs.mkdirSync('artifacts/player-stats', {recursive:true});
fs.writeFileSync('artifacts/player-stats/equipment-triage.json', JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
