// Deterministic real-combat audit. Generates an isolated review snapshot, never reads player saves.
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {buildGameRuntime}=require('./lib/game-runtime');
const build=require('./lib/world-tree-legal-build');
const attributeRoute=require('./lib/passive-attribute-route');
const runtime=buildGameRuntime();
const run=code=>vm.runInContext(code,runtime);
let seed=913;
runtime.Math=Object.create(Math);
runtime.Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
// DOM boundaries only; the equip, skill, passive and combat implementations stay real.
runtime.hideItemTooltip=()=>{};
runtime.showGameToast=()=>{};
run([attributeRoute,...Object.values(build)].map(fn=>fn.toString()).join('\n'));
const out=path.resolve('artifacts/world-tree-journey');
fs.mkdirSync(out,{recursive:true});
const reuse=process.argv.includes('--combat-only');
const defensive=process.argv.includes('--defense');
const prefix=defensive?'defense':'legal';
const report=reuse?JSON.parse(fs.readFileSync(path.join(out,prefix+'-build-report.json'),'utf8')):run(`configureWorldTreeLegalBuild(14,${defensive})`);
const snapshot=reuse?fs.readFileSync(path.join(out,prefix+'-build.json'),'utf8'):run('JSON.stringify(game)');
if(!reuse) {
    fs.writeFileSync(path.join(out,prefix+'-build.json'),snapshot);
    fs.writeFileSync(path.join(out,prefix+'-build-report.json'),JSON.stringify(report,null,2));
}
console.log(JSON.stringify({phase:'build',tier:report.tier,points:report.points,supports:report.supports,stats:report.stats}));
if(process.argv.includes('--build-only'))process.exit(0);

runtime.auditSnapshot=JSON.parse(snapshot);
const results=[];
const scenarios=['baseline','dodge'].flatMap(variant=>['grove','breach'].flatMap(branch=>
    [913,1729,2861].map(rng=>({variant,branch,rng}))));
for(const {variant,branch,rng} of scenarios) {
    seed=rng;
    run('game=mergeDefaults(JSON.parse(JSON.stringify(auditSnapshot)));window.game=game;');
    if(variant==='dodge') {
        const result=run("contentProgression.purchase('condition',game,'긴급 회피')");
        if(!result.ok)throw new Error(result.message);
    }
    const result=run(`simulateJourneyRoute('${branch}')`);
    results.push({variant,seed:rng,...JSON.parse(JSON.stringify(result))});
    console.log(JSON.stringify({variant,branch,seed:rng,seconds:result.seconds,result:result.result,zone:result.zone,progress:result.progress,kills:result.kills,currencies:result.currencies}));
}
fs.writeFileSync(path.join(out,prefix+'-combat-report.json'),JSON.stringify(results,null,2));
