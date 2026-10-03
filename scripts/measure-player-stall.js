// Desktop Node timing only; no player save or browser/mobile FPS claim.
// node scripts/measure-player-stall.js [--write]
const fs = require('node:fs');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const { buildGameRuntime } = require('./lib/game-runtime');
const ctx = buildGameRuntime();
ctx.Math = Object.create(Math); ctx.Math.random = () => .999999;
const run = code => vm.runInContext(code, ctx), start = 1700000000000;
run(`game=mergeDefaults({season:2,contentProgression:JSON.parse(JSON.stringify(defaultGame.contentProgression))});
    contentProgression.sync(game);contentProgression.purchase('craft',game);playerStall.advance(game,${start});
    var measureGear=createItemFromBase(BASE_ITEM_DB.find(base=>base.id==='apocalypse_greatblade'),'rare',20,{affixTierCap:20});
    measureGear.stats=['flatDmg','weaponFlatDmgPct','attackPctDmg','aspd','crit','critDmg'].map(id=>
        rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id===id),20,20));measureGear=normalizeItem(measureGear);
    var measureCheap=createItemFromBase(BASE_ITEM_DB.find(base=>base.id==='rusted_blade'),'normal',1);`);
const template=JSON.parse(run('JSON.stringify(game)'));
const premium=JSON.parse(run('JSON.stringify(measureGear)')), lowValue=JSON.parse(run('JSON.stringify(measureCheap)'));
function shop(item,negotiate) {
    const owner=ctx.mergeDefaults(structuredClone(template));
    owner.inventory=[0,1,2,3].map(index=>({...structuredClone(item),id:900000+index}));
    for(const row of [...owner.inventory]) {
        const result=ctx.playerStall.list(owner,row.id,1000000,start,{currency:'goldenRule',negotiate});
        if(!result.ok)throw new Error(result.reason);
    }
    return owner;
}
function measure(item,negotiate,elapsed,count) {
    const scene=shop(item,negotiate), times=[];
    for(let index=0;index<count+3;index++) {
        const owner=ctx.mergeDefaults(structuredClone(scene)), at=start+(elapsed??scene.playerStall.nextVisitAt-start);
        const before=performance.now(), paid=ctx.playerStall.advance(owner,at), duration=performance.now()-before;
        if(paid!==0 || owner.playerStall.listings.length!==4)throw new Error('Timing fixture must remain unsold for the entire window');
        if(index>=3)times.push(duration);
    }
    times.sort((a,b)=>a-b);
    return {runs:count,medianMs:+times[Math.floor(count/2)].toFixed(3),
        p95Ms:+times[Math.min(count-1,Math.floor(count*.95))].toFixed(3),maxMs:+times.at(-1).toFixed(3)};
}
const report={environment:{node:process.version,platform:process.platform},
    limitation:'Warm desktop Node domain timings, excluding setup, UI, browser and mobile. Not a CI pass/fail performance threshold.',
    scenarios:{onlineNoVisit:measure(premium,false,1,50),oneArrivalFourPremium:measure(premium,true,null,50),
        offline12hFourPremium:measure(premium,true,12*3600000,20),offline12hPremiumNoBids:measure(premium,false,12*3600000,20),
        offline12hLowValueWithBids:measure(lowValue,true,12*3600000,20)}};
if(process.argv.includes('--write'))fs.writeFileSync('artifacts/player-stall-review/performance-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
