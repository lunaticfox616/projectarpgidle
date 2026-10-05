// Controlled whole-map combat/travel survey. Synthetic gear, not a legal build or a human playtest.
const fs = require('node:fs');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const args = process.argv.slice(2);
const value = (flag, fallback) => args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const overrides = args.includes('--sources') ? JSON.parse(fs.readFileSync(value('--sources'), 'utf8')) : {};
const runtime = buildGameRuntime(overrides);
const run = code => vm.runInContext(code, runtime);
runtime.Math = Object.create(Math);
let seed = 0;
runtime.Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
runtime.Date = class extends Date { static now() { return 1800000000000; } };
const rows = [];
const probe = function (input) {
    const start = 1800000000000;
    game = mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',
        season:input.loop,loopCount:input.loop-1,currentZoneId:input.zone,maxZoneId:39,combatTimeMs:start,
        settings:{pauseGameOnOverlay:false,mapCompleteAction:'stop',showDeathNotice:false,autoEquipEmptySlots:false}});
    gameplayStarted=true;startupOverlayActive=false;game.isBackgroundCalculation=true;
    game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
    const zone=getZone(input.zone);game.level=levelProgression.areaLevel(zone);
    game.skills=['기본 공격',input.skill];game.activeSkill=input.skill;game.gemData[input.skill]={level:10,quality:0,exp:0};
    const reference=createEnemy(zone,{at:50,count:1},0),power=reference.maxHp*.6;
    game.equipment['무기']={id:990001,name:'측정 입력',slot:'무기',rarity:'rare',baseStats:[],stats:[
        {id:'flatDmg',val:power},{id:'flatHp',val:reference.maxHp*20},{id:'accuracy',val:10000},
        {id:'resAll',val:60},{id:'resChaos',val:60},{id:'aspd',val:60}]};
    startEncounterRun(true);game.actExploration.mode='full';
    const stats=getPlayerStats(false);game.playerHp=stats.maxHp;game.playerEnergyShield=stats.energyShield;
    const roster=game.actExploration.packs.flatMap(pack=>pack.waiting).concat(game.enemies);
    const count=new Set(roster.map(enemy=>enemy.id)).size,beginLevel=game.level;
    let elapsed=0,combatMs=0,travelMs=0,peakActive=0,xp=0,prevLevel=game.level,prevExp=game.exp;
    while(elapsed<180000 && !game.actExploration.completionApplied && !game.loopDeaths && !game.combatHalted) {
        const active=game.enemies.filter(enemy=>enemy.hp>0).length;
        peakActive=Math.max(peakActive,active);if(active)combatMs+=100;else travelMs+=100;
        elapsed+=100;coreLoop(start+elapsed);
        xp+=game.exp-prevExp;
        for(let level=prevLevel;level<game.level;level++)xp+=getExpReq(level);
        prevLevel=game.level;prevExp=game.exp;
    }
    return {...input,count,packs:game.actExploration.packs.length,elapsed,combatMs,travelMs,peakActive,xp,
        beginLevel,endLevel:game.level,levelProgress:game.exp/getExpReq(game.level),
        outcome:game.loopDeaths?'death':game.actExploration.completionApplied?'clear':game.combatHalted?'halt':'timeout'};
};
run(`window.packProbe=${probe.toString()}`);
const started=performance.now();
for(const loop of [1,10,30])for(const zone of [2,6,9,14])for(const skill of ['연속 베기','서리 폭발']) {
    seed=17;runtime.probeInput={loop,zone,skill};rows.push(JSON.parse(run('JSON.stringify(packProbe(probeInput))')));
}
const output=value('--output','artifacts/pack-balance/latest.json');
fs.mkdirSync(require('node:path').dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify({method:'24 seeded full-map coreLoop probes; synthetic damage based on ordinary enemy HP, not legal builds. 100 ms ticks, 180 s timeout. Travel includes entrance/settlement pauses. No player saves read or changed.',wallMs:performance.now()-started,rows},null,2)+'\n');
console.log(`${output}: ${rows.length} probes; ${rows.filter(row=>row.outcome==='clear').length} cleared`);
