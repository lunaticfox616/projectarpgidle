// Read-only synthetic progression: authored encounter packs, no player save or combat-speed claim.
const vm=require('node:vm');
const fs=require('node:fs');
const {performance}=require('node:perf_hooks');
const {buildGameRuntime}=require('./lib/game-runtime');
const r=buildGameRuntime(), run=code=>vm.runInContext(code,r);
r.Math=Object.create(Math);let seed=911;
r.Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const simulation=require('./lib/level-progression-simulation').toString();
console.table(JSON.parse(run(`JSON.stringify((${simulation})(1))`)));
const loopRows=[];
for(const season of [1,10,50,100,1000]) {
    const rows=JSON.parse(run(`JSON.stringify((${simulation})(${season}))`));
    loopRows.push({loop:season,act10Level:rows[9].exit,act10Loot:rows[9].lootPercent,
        chaos1Level:rows[10].exit,chaos1Loot:rows[10].lootPercent});
}
console.table(loopRows);
run(`(${require('./lib/offline-endgame-fixture').toString()})()`);
// Comparison group: same final calculator/build, only the newly added requirement evaluation removed.
const baseline=buildGameRuntime({
    'js/combat.js':fs.readFileSync('js/combat.js','utf8').replace('if (!equipmentView) return combatEquipmentStats.read(includeBreakdowns);',''),
    'js/combat-equipment-stats.js':fs.readFileSync('js/combat-equipment-stats.js','utf8').replace('return evaluate(owner).active;','return owner.equipment;')
});
baseline.auditState=JSON.parse(run('JSON.stringify(game)'));
vm.runInContext('game=auditState',baseline);
function measure(runtime) {
    for(let i=0;i<30;i++)runtime.getPlayerStats(false);
    const timings=[];
    for(let i=0;i<200;i++){const start=performance.now();runtime.getPlayerStats(false);timings.push(performance.now()-start);}
    timings.sort((a,b)=>a-b);return {median:timings[100],p95:timings[190]};
}
console.log(JSON.stringify({fullBuildStatsMs:{withoutRequirements:measure(baseline),withRequirements:measure(r)},
    penaltyAt40LevelGap:run("levelProgression.penalty(80,40,'loot')")},null,2));
