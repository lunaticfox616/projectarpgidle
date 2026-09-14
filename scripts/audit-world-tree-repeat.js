// Natural rewards and retained health/progress across repeated runs; no completion or loot injection.
const fs=require('node:fs');
const vm=require('node:vm');
const {buildGameRuntime}=require('./lib/game-runtime');
const {simulateJourneyRoute}=require('./lib/world-tree-legal-build');
const runtime=buildGameRuntime();
let seed=913;
runtime.Math=Object.create(Math);
runtime.Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
runtime.hideItemTooltip=()=>{};runtime.showGameToast=()=>{};
const out='artifacts/world-tree-journey/';
runtime.snapshot=JSON.parse(fs.readFileSync(out+'crafted-t15-build.json','utf8'));
const run=code=>vm.runInContext(code,runtime);
run('game=mergeDefaults(snapshot);window.game=game;');
run(simulateJourneyRoute.toString());
const results=[];
for(let attempt=0;attempt<4;attempt++) {
    const result=run("simulateJourneyRoute('grove')");
    results.push({attempt,...result});
    console.log(JSON.stringify({attempt,result:result.result,seconds:result.seconds,kills:result.kills,
        currencies:result.currencies,equipment:result.equipment}));
    if(result.result!=='guardian')break;
}
if(results.at(-1).result==='guardian') {
    run('worldTreeJourneyUi.stage(2);');
    const result=run("simulateJourneyRoute('breach')");
    results.push({stage:2,...result});
    console.log(JSON.stringify({stage:2,result:result.result,seconds:result.seconds,zone:result.zone}));
}
fs.writeFileSync(out+'repeat-combat-report.json',JSON.stringify(results,null,2));
