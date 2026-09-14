// Reachable equipment snapshot + nine earned loop points. Trials must actually be defeated.
const fs=require('node:fs');
const vm=require('node:vm');
const {buildGameRuntime}=require('./lib/game-runtime');
const {simulateJourneyRoute}=require('./lib/world-tree-legal-build');
const runtime=buildGameRuntime();
const run=code=>vm.runInContext(code,runtime);
const out='artifacts/world-tree-journey/';
let seed=913;
runtime.Math=Object.create(Math);
runtime.Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
runtime.showGameToast=()=>{};
runtime.hideItemTooltip=()=>{};
// Confirmation UI is the only stub; selections and point spending run through their real handlers.
runtime.requestGameConfirmation=async()=>true;
runtime.growthInput=JSON.parse(fs.readFileSync(out+'defense-build.json','utf8'));
run('game=mergeDefaults(growthInput);window.game=game;');

function clearGrowthTrial(id) {
    changeZone(id);
    if(game.currentZoneId!==id)throw new Error('Trial entry rejected: '+id);
    let ticks=0;
    while(ticks<6000&&!game.completedTrials.includes(id)) {
        coreLoop(getCombatTime()+100);ticks++;
        if(game.lastDeathLog)throw new Error('Trial failed: '+id);
    }
    if(!game.completedTrials.includes(id))throw new Error('Trial timed out: '+id);
    return {id,seconds:ticks/10,points:game.ascendPoints,keystonePoints:game.ascendKeystonePoints};
}
async function investJourneyGrowth() {
    for(const id of ['loopTree','trials']) {
        const result=contentProgression.purchase(id,game);
        if(!result.ok)throw new Error('Growth unlock rejected: '+id);
    }
    game.seasonPoints=game.loopCount;
    const nodes=['s_root','s_hp','s_guard','s_blood','s_dmg','s_speed','s_crit','s_momentum','s_rend'];
    for(const id of nodes) {
        await buySeason(id);
        if(!game.seasonNodes.includes(id))throw new Error('Loop node rejected: '+id);
    }
    const trials=[clearGrowthTrial('trial_1')];
    await selectClass('warrior');
    buyAscend('n1');buyAscend('n2');buyAscendKeystone('w1');
    trials.push(clearGrowthTrial('trial_2'));
    buyAscend('n3');buyAscend('n6');buyAscendKeystone('w2');
    if(game.ascendNodes.length!==4||game.ascendKeystones.length!==2||game.seasonPoints!==0)throw new Error('Growth allocation mismatch');
    game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;
    game.playerHp=getPlayerHpCap(getPlayerStats(false));game.lastDeathLog=null;
    const stats=getPlayerStats(false);
    if(Object.keys(stats.disabledEquipment).length)throw new Error('Growth invalidated equipment');
    return {trials,seasonNodes:game.seasonNodes,ascendNodes:game.ascendNodes,keystones:game.ascendKeystones,
        hp:stats.maxHp,dps:stats.totalDps,armor:stats.armor,regen:stats.regen,dr:stats.dr,
        resistances:[stats.resF,stats.resC,stats.resL,stats.resChaos]};
}
run([clearGrowthTrial,investJourneyGrowth,simulateJourneyRoute].map(fn=>fn.toString()).join('\n'));
async function main() {
    const growth=await run('investJourneyGrowth()');
    fs.writeFileSync(out+'growth-build-report.json',JSON.stringify(growth,null,2));
    const snapshot=run('JSON.stringify(game)');
    fs.writeFileSync(out+'growth-build.json',snapshot);
    console.log(JSON.stringify({phase:'growth',...growth}));
    const results=[];
    runtime.preparedGrowth=JSON.parse(snapshot);
    for(const branch of ['grove','breach'])for(const rng of [913,1729,2861]) {
        seed=rng;run('game=mergeDefaults(JSON.parse(JSON.stringify(preparedGrowth)));window.game=game;');
        const result=run(`simulateJourneyRoute('${branch}')`);
        results.push({seed:rng,...JSON.parse(JSON.stringify(result))});
        console.log(JSON.stringify({branch,seed:rng,result:result.result,seconds:result.seconds,zone:result.zone,kills:result.kills}));
    }
    fs.writeFileSync(out+'growth-combat-report.json',JSON.stringify(results,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
