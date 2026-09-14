// Sensitivity benchmark: legal top-roll rare affixes, not an acquisition-time or typical-entry build.
const fs=require('node:fs');
const vm=require('node:vm');
const {buildGameRuntime}=require('./lib/game-runtime');
const {simulateJourneyRoute}=require('./lib/world-tree-legal-build');
const out='artifacts/world-tree-journey/';
const tier=Number(process.argv.find(arg=>arg.startsWith('--tier='))?.slice(7) || 20);
if(![10,15,20].includes(tier))throw new Error('Supported crafting tiers: 10, 15, 20');
const branch=process.argv.includes('--breach')?'breach':'grove';
const prefix=(tier===20?'crafted':'crafted-t'+tier)+(branch==='breach'?'-breach':'');
function craftedJourneyScore(stats) {
    const resistance=['resF','resC','resL','resChaos'].reduce((sum,key)=>
        sum-Math.pow(Math.max(0,60-stats[key])/60,2),0);
    return 2*Math.log(Math.max(1,stats.totalDps))+Math.log(Math.max(1,stats.maxHp))
        +resistance+Math.min(10,stats.regen)/10+0.3*Math.log1p(stats.armor/1000);
}
function craftJourneyCeiling(tier) {
    for(const [slot,old] of Object.entries(game.equipment)) {
        if(!old)continue;
        const item={...old,stats:[],affixTierCap:Math.max(old.affixTierCap,tier),
            itemTier:Math.max(old.itemTier,tier),hiddenTier:Math.max(old.hiddenTier,tier),
            itemLevel:Math.max(old.itemLevel,levelProgression.tierLevel(tier))};
        game.equipment[slot]=item;
        for(let count=0;count<5;count++) {
            let best=null,score=-Infinity;
            for(const mod of getAvailableMods(item)) {
                const stat=rollAffixValueInTierRange(mod,tier,tier);
                item.stats.push(stat);
                const candidate=getPlayerStats(false);
                const next=craftedJourneyScore(candidate);
                item.stats.pop();
                if(!Object.keys(candidate.disabledEquipment).length&&next>score){best=stat;score=next;}
            }
            if(!best)throw new Error('No legal crafting candidate: '+slot);
            item.stats.push(best);
        }
        if(!canEquipItemToSlot(item,slot))throw new Error('Crafted equipment fails requirements: '+slot);
    }
    game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;
    const stats=getPlayerStats(false);
    if(Object.keys(stats.disabledEquipment).length)throw new Error('Crafted equipment disabled after save');
    game.playerHp=getPlayerHpCap(stats);game.playerEnergyShield=stats.energyShield;game.lastDeathLog=null;
    return {dps:stats.totalDps,hp:stats.maxHp,armor:stats.armor,regen:stats.regen,
        resistances:[stats.resF,stats.resC,stats.resL,stats.resChaos]};
}
function makeRuntime(snapshot,legacy=false) {
    const overrides=legacy?{'data/world-tree-journey.js':fs.readFileSync('data/world-tree-journey.js','utf8')
        .replace('bossHpMul:0.15','bossHpMul:1').replace('bossHpMul:0.4','bossHpMul:1')}:{};
    const runtime=buildGameRuntime(overrides);
    runtime.Math=Object.create(Math);runtime.Math.random=()=>0.999999;
    runtime.hideItemTooltip=()=>{};runtime.showGameToast=()=>{};
    runtime.input=JSON.parse(snapshot);
    vm.runInContext('game=mergeDefaults(input);window.game=game;',runtime);
    vm.runInContext([craftedJourneyScore,craftJourneyCeiling,simulateJourneyRoute].map(fn=>fn.toString()).join('\n'),runtime);
    return runtime;
}
const source=fs.readFileSync(out+'growth-build.json','utf8');
const runtime=makeRuntime(source);
const stats=vm.runInContext(`craftJourneyCeiling(${tier})`,runtime);
const snapshot=vm.runInContext('JSON.stringify(game)',runtime);
fs.writeFileSync(out+prefix+'-build.json',snapshot);
console.log(JSON.stringify({phase:'T'+tier+' upper-roll sensitivity build',...stats}));
const results=[];
for(const legacy of (process.argv.includes('--current-only')?[false]:[true,false]))for(const seed of [913,1729]) {
    const context=makeRuntime(snapshot,legacy);let rng=seed;
    context.Math.random=()=>{rng=(rng*1664525+1013904223)>>>0;return rng/4294967296;};
    const result=vm.runInContext(`simulateJourneyRoute('${branch}')`,context);
    results.push({legacy,seed,...result});
    console.log(JSON.stringify({legacy,seed,result:result.result,seconds:result.seconds,zone:result.zone,kills:result.kills}));
}
fs.writeFileSync(out+prefix+'-combat-report.json',JSON.stringify({tier,stats,results},null,2));
